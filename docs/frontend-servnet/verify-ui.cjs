// Verificação do frontend com dados sintéticos; nenhuma API real é chamada.
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const dir = process.env.SERVNET_SCREENSHOT_DIR || '/tmp/servnet-screenshots';
fs.mkdirSync(dir, { recursive: true });
const baseUser = { id: 1, name: 'Mariana Oliveira', email: 'mariana@example.test', role: 'ADMIN', grupo: 'Administrativo', cargo: 'Analista', group: {id:1,name:'Administrativo'}, position:{id:1,name:'Analista'}, groupIds:[1], isHr:false, isDocumentPublisher:true, isAccounting:true, mustChangePassword:false };
const staff = { ...baseUser, id: 2, name: 'Ana Carolina de Souza', email: 'ana@example.test', role:'USER' };
const client = { id:1,userId:3,fullName:'João Carlos Pereira',email:'joao@example.test',cpfMasked:'***.***.***-25',phone:'(11) 99999-0000',birthDate:'1985-05-05',mustChangePassword:true };
const file = {originalName:'documento-demonstracao.pdf'};
const payslip = {id:1,month:9,year:2026,publishedAt:'2026-10-01',status:'PUBLISHED',file,user:{name:client.fullName}};
const docs = [{id:2,type:'IRPF',title:'Informe de rendimentos',taxYear:2025,publishedAt:'2026-10-01',file,user:{name:client.fullName}},{id:3,type:'ITAU_BANK_SLIP',title:'Boleto mensal',amount:245,dueDate:'2026-11-10',publishedAt:'2026-10-02',file,user:{name:client.fullName}}];
const vacation = {id:1,userId:2,userName:staff.name,userGroup:'Administrativo',status:'PENDING',days:15,startDate:'2026-11-03',endDate:'2026-11-17',createdAt:'2026-10-06'};
(async()=>{
 const browser = await chromium.launch({executablePath:process.env.SERVNET_CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 const summaries=[];
 for (const width of [1440,768,390,320]) {
  const context = await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on("requestfailed", r=>console.log("FAILED",r.url(),r.failure()));
  let user={...baseUser}; let calls=[]; let requests=[{...vacation}]; let empty=false; let apiFailure=false;
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:3000/**', async route=>{
   const req=route.request();const url=new URL(req.url());const path=url.pathname;const method=req.method();
   calls.push({path,method,body:req.postData(),query:url.search});
   if(method==='OPTIONS') return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
   let data={};let status=200;
   if(apiFailure && path!='/auth/me'){status=500;data={error:'Não foi possível carregar os dados. Tente novamente.'};}
   else if(path==='/auth/me')data={user};
   else if(path==='/auth/login')data={token:'fixture-token',user};
   else if(path==='/auth/organization-options')data={groups:[baseUser.group],positions:[baseUser.position],roles:[{id:1,code:'USER'},{id:2,code:'COORDINATOR'},{id:3,code:'ADMIN'}]};
   else if(path==='/auth/users' && method==='GET')data={users:empty?[]:[staff,{...baseUser,role:'COORDINATOR'}]};
   else if(path==='/auth/users' && method==='POST')data={user:{...staff,id:8,...JSON.parse(req.postData())}};
   else if(/^\/auth\/users\/\d+$/.test(path) && method==='PATCH')data={user:staff};
   else if(path==='/auth/password-reset-requests' && method==='GET')data={requests:empty?[]:[{id:1,user:staff}]};
   else if(path==='/clients' && method==='GET')data={clients:empty?[]:[client]};
   else if(path==='/clients' && method==='POST')data={message:'Cliente criado com sucesso.'};
   else if(path==='/dashboard/requests' && method==='POST'){requests.push({...vacation,id:4});data={request:requests.at(-1)};}
   else if(['/dashboard/requests','/dashboard/requests/mine'].includes(path))data={requests:empty?[]:requests};
   else if(path==='/dashboard/hr/requests')data={requests:empty?[]:requests.map(r=>({...r,status:'PENDING_HR'}))};
   else if(/\/requests\/\d+/.test(path)&&method==='PATCH') {const body=JSON.parse(req.postData());data={request:{...vacation,...body,status:body.status==='APPROVED'&&!path.includes('/hr/')?'PENDING_HR':body.status}};}
   else if(path.endsWith('/download'))return route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'});
   else if(['/dashboard/payslips/mine','/dashboard/admin/payslips'].includes(path))data={payslips:empty?[]:[payslip]};
   else if(['/dashboard/client/documents','/dashboard/admin/client-documents'].includes(path))data={documents:empty?[]:docs};
   else if(['/auth/register','/auth/forgot-password','/auth/change-password','/auth/password-reset-requests'].includes(path))data={message:'ok'};
   else if(method==='DELETE')data={message:'ok'};
   else throw Error(`Unmocked API ${method} ${path}`);
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':'*'}});
  });
  async function session(u){ user={...u};await page.goto('http://localhost:5173/');await page.evaluate(u=>{localStorage.setItem('accessmanager:token','fixture-token');localStorage.setItem('accessmanager:user',JSON.stringify(u));},user); }
  async function visit(path){await page.goto('http://localhost:5173'+path);await page.locator('h1').waitFor();await page.waitForTimeout(100);const metrics=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));assert(metrics.page<=metrics.viewport, `${path} ${width}: overflow ${metrics.page}`);}
  async function screenshot(name){ if(width===1440||width===390)await page.screenshot({path:`${dir}/${name}-${width===1440?'desktop':'mobile'}.png`,fullPage:true}); }
  // Public pages and validation feedback.
  await visit('/');await screenshot('inicio');
  await page.getByRole('link',{name:'Entrar no SERVNET'}).click();await page.getByRole('heading',{name:'Entre na sua conta'}).waitFor();
  await page.getByRole('button',{name:'Entrar',exact:true}).click();assert(await page.getByText('Informe seu e-mail.').isVisible());
  await screenshot('login');
  await page.getByLabel('E-mail',{exact:true}).fill('mariana@example.test');await page.getByLabel('Senha',{exact:true}).fill('senha-teste-123');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForTimeout(500); await page.getByRole('heading',{name:'Painel administrativo'}).waitFor();
  await visit('/esqueci-minha-senha');await page.getByLabel('E-mail',{exact:true}).fill('ana@example.test');await page.getByRole('button',{name:'Solicitar redefinição'}).click();await page.getByRole('status').waitFor();
  await visit('/cadastro');await page.locator('select[name=groupId]').waitFor();
  // Admin modal, search, password reset and responsive tables.
  await session(baseUser);await visit('/admin');await screenshot('administracao');
  await page.getByRole('button',{name:'Adicionar usuário',exact:true}).click();await page.getByRole('dialog').waitFor();
  await page.getByLabel('Nome',{exact:true}).fill('Carlos Silva');await page.getByLabel('E-mail',{exact:true}).fill('carlos@example.test');await page.getByLabel('Senha',{exact:true}).fill('senha-teste-123');
  await page.getByLabel('Cargo').selectOption('1');await page.getByLabel('Grupo').selectOption('1');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Editar',exact:true}).first().click();await page.getByRole('dialog').waitFor();await screenshot('editar-acesso');await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:'Definir senha temporária',exact:true}).click();await page.getByLabel('Senha temporária',{exact:true}).fill('senha-temporaria-123');await page.getByRole('button',{name:'Redefinir',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('searchbox').fill('Ana');await page.getByRole('button',{name:'Pesquisar',exact:true}).click();await page.waitForTimeout(100);assert(calls.some(c=>c.path==='/auth/users'&&c.query==='?search=Ana'));
  // Client administration.
  await visit('/admin/clientes');await screenshot('clientes');
  await page.getByLabel('Nome completo',{exact:true}).fill('João Carlos Pereira');await page.getByLabel('CPF',{exact:true}).fill('52998224725');await page.getByLabel('Telefone',{exact:true}).fill('11999990000');await page.getByLabel('E-mail de acesso',{exact:true}).fill('joao@example.test');await page.getByLabel('Senha temporária',{exact:true}).fill('senha-temporaria-123');await page.getByRole('button',{name:'Criar cliente'}).click();await page.getByText('Cliente criado com sucesso.').waitFor();
  // Employee vacation submission.
  await session({...staff,isDocumentPublisher:false,isAccounting:false});await visit('/usuario');await screenshot('funcionario');
  await page.getByLabel('Início',{exact:true}).fill('2026-11-03');await page.getByLabel('Fim',{exact:true}).fill('2026-11-17');await page.getByLabel('Observação',{exact:true}).fill('Período de férias');await page.getByRole('button',{name:'Enviar solicitação'}).click();await page.getByText('Solicitação enviada ao coordenador da sua área.').waitFor();assert(calls.some(c=>c.path==='/dashboard/requests'&&c.method==='POST'&&JSON.parse(c.body).startDate==='2026-11-03'));
  // Coordinator and RH decisions.
  await session({...baseUser,role:'COORDINATOR',isDocumentPublisher:false});await visit('/coordenador');await screenshot('coordenador');await page.getByRole('button',{name:'Aprovar',exact:true}).first().click();await page.getByText('Aguardando RH').first().waitFor();
  await session({...staff,isHr:true});await visit('/rh');await screenshot('rh');await page.getByRole('button',{name:'Recusar',exact:true}).first().click();await page.getByText('Informe o motivo para recusar as férias.').waitFor();await page.getByLabel('Motivo / observação').first().fill('Ajustar período com a equipe.');await page.getByRole('button',{name:'Recusar',exact:true}).first().click();await page.getByText('Férias recusadas com sucesso.').waitFor();
  // Upload PDF for each supported type.
  await session({...staff,isDocumentPublisher:true,isAccounting:true});await visit('/documentos');await screenshot('documentos');
  for(const type of ['PAYSLIP','IRPF','ITAU_BANK_SLIP']) {await page.getByLabel('Tipo de documento').selectOption(type);if(type==='ITAU_BANK_SLIP')await page.getByLabel('Vencimento',{exact:true}).fill('2026-11-10');await page.locator('input[type=file]').setInputFiles({name:'documento-demonstracao.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});await page.getByRole('button',{name:'Publicar para o cliente'}).click();await page.getByText(/publicado com segurança para o cliente/).waitFor();}
  // Client downloads and role guards.
  await session({...baseUser,id:3,name:client.fullName,role:'CLIENT',isDocumentPublisher:false,isAccounting:false});await visit('/cliente');await screenshot('portal-cliente');const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar PDF'}).first().click();assert.equal((await downloaded).suggestedFilename(),file.originalName);assert.equal(await page.getByRole('button',{name:'Publicar documentos'}).count(),0);
  await page.goto('http://localhost:5173/admin');await page.getByRole('heading',{name:'Meus documentos'}).waitFor();assert(page.url().endsWith('/cliente'));
  // Required password change keeps existing validation and logout.
  await session({...staff,mustChangePassword:true});await page.goto('http://localhost:5173/usuario');await page.getByRole('heading',{name:'Crie uma nova senha'}).waitFor();assert(page.url().endsWith('/alterar-senha'));await screenshot('alterar-senha');await page.getByLabel('Nova senha',{exact:true}).fill('nova-senha-teste-123');await page.getByLabel('Confirmar nova senha',{exact:true}).fill('nova-senha-teste-123');await page.getByRole('button',{name:'Alterar senha',exact:true}).click();await page.getByRole('heading',{name:'Entre na sua conta'}).waitFor();
  // Empty and failure states.
  empty=true;await session(baseUser);await visit('/admin');assert(await page.getByText('Nenhum usuário ativo.').isVisible());apiFailure=true;await visit('/admin');await page.getByRole('alert').waitFor();assert(await page.getByRole('alert').isVisible());apiFailure=false;
  await page.getByRole('button',{name:'Sair',exact:true}).click();await page.getByRole('heading',{name:'Entre na sua conta'}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('accessmanager:token')),null);
  assert.deepEqual(errors,[]);summaries.push({width,pages:12,flows:'login, reset, admin, clients, vacation, coordinator, RH, uploads, downloads, guards, logout',errors:0});await context.close();
 }
 await browser.close();console.log(JSON.stringify(summaries,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
