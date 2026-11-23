// Tries TypeSafe Jev as a router: one "choice" question over the router index.
// Calls the Cloudflare REST API through the second-brain AI Gateway (Unified Billing).
//
//   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run run -w scripts/jev-lab [-- --model typesafe/jev-1.14.0]
//   (--model anthropic/claude-sonnet-5.5 runs the same cases on Claude for comparison)
//
// The token needs Workers AI Read+Edit. Edit targets.json / cases.json to experiment.
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const model = args.includes("--model") ? args[args.indexOf("--model") + 1] : "typesafe/jev";
const gateway = process.env.AI_GATEWAY_ID ?? "second-brain";
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");

const dir = new URL(".", import.meta.url);
const { _comment, ...targets } = JSON.parse(readFileSync(new URL("targets.json", dir), "utf8"));
const cases = JSON.parse(readFileSync(new URL("cases.json", dir), "utf8"));

async function route(text) {
  const t0 = Date.now();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "cf-aig-gateway-id": gateway,
    },
    body: JSON.stringify({
      model,
      input: {
        state: { message: text },
        questions: {
          target: {
            type: "choice",
            instructions:
              "A `message` egy személyes jegyzetrendszerbe Telegramon beküldött üzenet. Melyik mappába kerüljön?",
            criteria: targets,
          },
        },
      },
    }),
  });
  const body = await res.json();
  if (!res.ok || body.success === false) throw new Error(`${res.status} ${JSON.stringify(body.errors ?? body)}`);
  // REST wraps the model output: { result: { state, result: { answers, usage } } }
  const out = body.result?.result ?? body.result ?? body;
  return { answer: out.answers.target, usage: out.usage, ms: Date.now() - t0 };
}

// Same question to a Claude model, for comparison. It has no calibrated
// probabilities, so it reports its own confidence.
async function routeClaude(text) {
  const t0 = Date.now();
  const list = Object.entries(targets).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "cf-aig-gateway-id": gateway,
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      // Claude 5.5 models think adaptively by default, which can use up max_tokens.
      thinking: { type: "disabled" },
      system:
        "Egy személyes jegyzetrendszerbe Telegramon beküldött üzenetet kell a megfelelő mappába sorolnod.\n" +
        `Mappák:\n${list}\n\n` +
        'Válaszolj KIZÁRÓLAG JSON-nal: {"choice": "<mappa pontos neve>", "confidence": <0..1>}',
      messages: [{ role: "user", content: text }],
    }),
  });
  const body = await res.json();
  if (!res.ok || body.type === "error" || body.success === false) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  const raw = body.content?.find((c) => c.type === "text")?.text ?? "";
  const answer = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return { answer, usage: body.usage, ms: Date.now() - t0 };
}

let hits = 0;
for (const c of cases) {
  let answer, usage, ms;
  try {
    ({ answer, usage, ms } = await (model.startsWith("anthropic/") ? routeClaude(c.text) : route(c.text)));
  } catch (err) {
    console.log(`💥 ${c.text}\n   hiba: ${err.message}`);
    continue;
  }
  const ok = answer.choice === c.expect;
  hits += ok;
  const top = Object.entries(answer.probabilities ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, p]) => `${k} ${(p * 100).toFixed(0)}%`)
    .join(", ");
  console.log(`${ok ? "✅" : "❌"} ${c.text}`);
  console.log(`   → ${answer.choice} (conf ${answer.confidence}) | top: ${top} | ${usage?.input_tokens} tok, ${ms} ms`);
  if (!ok) console.log(`   várt: ${c.expect}`);
}
console.log(`\n${model}: ${hits}/${cases.length} találat`);
