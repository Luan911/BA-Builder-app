import { extractFromText } from '../js/importers/text.js';
import { analyseCode, inventoryMarkdown } from '../js/importers/code.js';
import { applyTextCandidates, applyTables, applyRequirementsCsv, REQUIREMENTS_CSV_TEMPLATE } from '../js/importers/apply.js';
import { blankProject } from '../js/model.js';
const notes = `Meeting with client 12 Nov.
- As a customer, I want to track my order online so that I don't need to call support.
- Customers must be able to reset their password by email.
- The system should respond within 2 seconds for 95% of requests.
- Decision: we will use Stripe for payments.
- Risk: the warehouse API might not be ready before March.
- We assume all stores have stable internet.
- Orders cannot exceed R50 000 per transaction.
- A customer may hold at most 3 open returns.
- Do we need multi-currency support?
- Given a customer has an open order, when they open the tracking page, then the current status is shown.`;
const ex = extractFromText(notes);
for (const [k,v] of Object.entries(ex)) if (v.length) console.log(k, JSON.stringify(v));
const p = blankProject(); console.log(applyTextCandidates(p, ex)); console.log(p.requirements.map(r=>[r.code,r.title,r.statement]));
const files = [
 {path:'api/server.js', content:"const app=express();\napp.get('/api/orders/:id', h);\nrouter.post('/api/orders', create);\nfunction create(req,res){}\nconst list = async (a) => a;\nconst k=process.env.STRIPE_KEY;"},
 {path:'db/schema.sql', content:"CREATE TABLE customers (id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, total DECIMAL(10,2));\nCREATE TABLE orders (\n id SERIAL,\n customer_id UUID NOT NULL REFERENCES customers(id),\n status VARCHAR(20),\n PRIMARY KEY (id)\n);"},
 {path:'svc/OrdersController.cs', content:'[Route("api/[controller]")]\npublic class OrdersController { [HttpGet("{id}")] public IActionResult Get(int id) { return Ok(); } }'},
 {path:'app.py', content:"@app.route('/health', methods=['GET'])\ndef health():\n  return 'ok'\nx=os.getenv('DB_URL')"},
 {path:'main.go', content:'func main() { r.GET("/ping", ping) }\ntype User struct {}'},
 {path:'.env', content:'SECRET=1'},
 {path:'node_modules/x/index.js', content:''},
 {path:'package.json', content:'{"dependencies":{"express":"^4.0.0"},"scripts":{"start":"node api/server.js"}}'},
];
const inv = analyseCode(files);
console.log(inv.routes.map(r=>`${r.method} ${r.path} (${r.framework})`));
console.log(inv.tables.map(t=>t.name+': '+t.columns.map(c=>`${c.name}:${c.type}${c.pk?':PK':''}${c.fk?':FK>'+c.fk:''}`).join(',')));
console.log('classes', inv.classes.map(c=>c.name), 'funcs', inv.functions.map(f=>f.name), 'env', inv.envVars, 'skipped', inv.skipped, 'entry', inv.entryPoints);
const p2 = blankProject(); console.log('tables added', applyTables(p2, inv.tables), p2.entities.map(e=>e.name+':'+e.fields.map(f=>f.fk).join('/')), p2.relationships.length);
console.log(applyRequirementsCsv(p2, REQUIREMENTS_CSV_TEMPLATE), p2.requirements[0]);
console.log(inventoryMarkdown(inv,'test').slice(0,400));
