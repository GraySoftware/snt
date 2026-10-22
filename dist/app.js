const A='https://cdn.prod.website-files.com/67e08b44d7e9762ca9d6f1c6/';
const content=document.querySelector('#content');
const routes={
  '/':home,
  '/kor':home,
  '/firearms':firearms,
  '/kor/firearms':firearms,
  '/about':about,
  '/kor/about':about,
  '/support':support,
  '/kor/support':support,
  '/contact':contact,
  '/kor/contact':contact
};
function setPage(name,title,render){ document.title=`${title} | SNT Defense`; document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===name)); content.innerHTML=render; window.scrollTo(0,0); }
function home(){setPage('home','Home',`
  <section class="hero hero--home"><div class="hero__inner"><h1>Global Defense Company</h1><p>Creating the future with trust, precision and technology.</p></div></section>
  <section class="section" id="business"><div class="wrap"><div class="section-kicker">Our capabilities</div><h2>Business</h2><p class="lead">SNT Defense builds on decades of precision manufacturing experience across defense, mobility and advanced components.</p><div class="business-grid">
    ${card('01','Defense','67e1e1b51adec107213027c7_mbis_tit.jpg','Precision defense systems developed for reliability in demanding environments.')}
    ${card('02','Mobility','67e1e7227c92b6302c2bbf6c_mbis_img02.jpg','Engineering capability shaped by automotive and mobility manufacturing.')}
    ${card('03','Firearms','67e23e1acf7452f77d1fc6a7_mbis_mimg04.jpg','A full lineup built on manufacturing discipline and field experience.')}
    ${card('04','Powertrain','67e2be4b977fcfc8d1bf5e6f_mbis_img05.jpg','Core components for efficient, high-performance mobility systems.')}
    ${card('05','Electronics','67e2be948a581e9d0183a6e1_mbis_img06.jpg','Integrated mechanical, electronic and information technologies.')}
    ${card('06','SCMC','67e2bef1c5a78aef862866cd_mbis_img07.jpg','Globally competitive production technology for precision components.')}
  </div></div></section>
  <section class="split"><div class="split__image" role="img" aria-label="SNT manufacturing"></div><div class="split__content"><div class="section-kicker">SNT Defense</div><h2>Precision built over decades</h2><p>The original site mixes content from several SNT businesses. This rebuild preserves the strongest verified material while establishing a clean foundation for corrected SNT Defense copy.</p><a class="button" href="/about">Company overview</a></div></section>`)}
function card(no,title,img,text){return `<article class="business-card" style="background-image:url('${A+img}')"><small>${no}</small><h3>${title}</h3><p>${text}</p></article>`}
function firearms(){setPage('firearms','Firearms',`
  <section class="hero hero--sub hero--firearms"><div class="hero__inner"><h1>Category: Rifles</h1><p>K2 / K2C1</p></div></section>
  <nav class="category-bar" aria-label="Firearm models"><a href="#k13">K13 Rifle</a><a class="active" href="#k2">K2 / K2C1</a><a href="#k2c">K2C</a><a href="#k14">K14</a><a href="#stsm21">STSM21</a></nav>
  <section class="product" id="k2"><div class="wrap"><h2>K2 / K2C1</h2><p class="product-subtitle">5.56 × 45mm (NATO)</p><img class="product-shot" src="${A+'67e436bca9612959b41c98b9_prod%201-p-1600.png'}" alt="K2 / K2C1 rifle profile"><div class="specs"><div class="spec"><span>Caliber</span><strong>5.56 × 45mm NATO</strong></div><div class="spec"><span>Operating system</span><strong>Gas operated</strong></div><div class="spec"><span>Barrel</span><strong>465mm / 18.3 in</strong></div><div class="spec"><span>Weight</span><strong>3.4–3.5 kg</strong></div></div><div class="notice">Product details are reconstructed from the public website and should be verified against approved company materials before publication.</div></div></section>`)}
function about(){setPage('about','About',`
  <section class="hero hero--sub hero--about"><div class="hero__inner"><h1>About Us</h1><p>Audacious challenges. A heritage of precision.</p></div></section>
  <nav class="category-bar" aria-label="About sections"><a class="active" href="#overview">Overview</a><a href="#history">History</a><a href="#values">Values</a><a href="#sites">Business Sites</a></nav>
  <section class="section" id="overview"><div class="wrap intro-grid"><div><div class="section-kicker">Overview</div><h2>Built on precision technology</h2><p class="lead">Founded in December 1981, the organization represented on the original site describes more than four decades of experience spanning defense manufacturing and precision components, with operations in Korea and international markets.</p><div class="notice">The source site repeatedly identifies the company as “SNT Motiv.” Legal entity names, history and figures require confirmation before the final SNT Defense site goes live.</div></div><img src="${A+'67e41e3491374725fefddc81_overview_topimg.jpg'}" alt="SNT precision manufacturing facility"></div></section>
  <section class="section section--soft" id="values"><div class="wrap"><div class="section-kicker">Culture</div><h2>Spirit and culture</h2><div class="facts"><div class="fact"><strong>Integrity</strong><span>Transparent decisions and responsible operations.</span></div><div class="fact"><strong>Precision</strong><span>Engineering discipline developed over decades.</span></div><div class="fact"><strong>Progress</strong><span>Proactive, future-oriented thinking and action.</span></div></div></div></section>`)}
function support(){setPage('support','Support',`
  <section class="hero hero--sub hero--support"><div class="hero__inner"><h1>Support</h1><p>We create a sustainable future for everyone.</p></div></section>
  <nav class="category-bar" aria-label="Sustainability sections"><a href="#esg">ESG Management</a><a href="#human-rights">Human Rights</a><a class="active" href="#ethics">Ethical Management</a><a href="#quality">Quality</a><a href="#environment">Environment</a></nav>
  <section class="section" id="ethics"><div class="wrap"><div class="section-kicker">Sustainability</div><h2>Ethical Management</h2><div class="ethics-banner"><p>SNT establishes an ethical corporate culture by complying with laws, principles and responsible business practices.</p></div><div class="principles"><article class="principle"><b>01</b><h3>Workplace discipline</h3><p>Operate responsibly, protect confidential information and use company resources appropriately.</p></article><article class="principle"><b>02</b><h3>Respect at work</h3><p>Maintain a workplace free from harassment, discrimination and inappropriate conduct.</p></article><article class="principle"><b>03</b><h3>Fair partnerships</h3><p>Avoid conflicts of interest, improper gifts and conduct that undermines fair trade.</p></article></div></div></section>`)}
function contact(){setPage('contact','Contact',`
  <section class="hero hero--sub hero--contact"><div class="hero__inner"><h1>Contact Us</h1><p>Questions, feedback or partnership inquiries—we would be glad to hear from you.</p></div></section>
  <section class="section"><div class="wrap contact-grid"><aside class="contact-card"><div class="section-kicker">Contact</div><h2>Get in touch</h2><p>1850 E Maule Ave<br>Las Vegas, NV 89119</p><p>This reconstructed form is currently local-only. Connect an approved inbox or CRM before public launch.</p></aside><form id="contact-form"><div class="form-grid"><label>First name<input name="firstName" autocomplete="given-name" required></label><label>Last name<input name="lastName" autocomplete="family-name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Company<input name="company" autocomplete="organization"></label><label class="full">Message<textarea name="message" required></textarea></label><label class="full"><button class="button" type="submit">Prepare inquiry</button></label></div><p class="form-note" id="form-status">No information will be transmitted from this local prototype.</p></form></div></section>`);
  document.querySelector('#contact-form').addEventListener('submit',e=>{e.preventDefault();document.querySelector('#form-status').textContent='Form validated locally. An approved delivery destination is still required.';});}
function render(){ const path=location.pathname.replace(/\/$/,'')||'/'; (routes[path]||home)(); }
document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const url=new URL(link.href,location.href);if(url.origin===location.origin){event.preventDefault();history.pushState({},'',url.pathname+url.hash);render();document.querySelector('#primary-nav').classList.remove('open');}});
document.querySelector('.menu-toggle').addEventListener('click',event=>{const nav=document.querySelector('#primary-nav');const open=nav.classList.toggle('open');event.currentTarget.setAttribute('aria-expanded',String(open));});
addEventListener('popstate',render); render();
