/* ================================================================
   RENTLY SHARED RUNTIME
   Icon set, duotone "photography" placeholders, mock data, and the
   handful of interaction patterns (reveal-on-scroll, nav state,
   date-range picker, avatar menu) reused across every screen.
   ================================================================ */

/* ---------------- ICONS (feather-style outline, 24x24 viewBox) ---------------- */
const ICONS = {
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  pin:'<path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z"/><circle cx="12" cy="9" r="2.5"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  star:'<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3-5.5-3-5.5 3 1-6.3L3 8.9 9 8z"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  close:'<path d="M18 6L6 18M6 6l12 12"/>',
  chevronLeft:'<path d="M15 18l-6-6 6-6"/>',
  chevronRight:'<path d="M9 18l6-6-6-6"/>',
  chevronDown:'<path d="M6 9l6 6 6-6"/>',
  arrowUpRight:'<path d="M7 17L17 7M7 7h10v10"/>',
  arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  message:'<path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
  bell:'<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.13 4.2l.06.06A1.7 1.7 0 0 0 9.06 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  camera:'<path d="M4 8a2 2 0 0 1 2-2h1.2l1-2h7.6l1 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>',
  shield:'<path d="M12 2l8 3.5v6c0 5-3.4 8.7-8 10.5-4.6-1.8-8-5.5-8-10.5v-6z"/>',
  card:'<rect x="2" y="5" width="20" height="15" rx="2.5"/><path d="M2 10h20"/>',
  wallet:'<path d="M20 7H6a3 3 0 0 0 0 6h13a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/><path d="M20 13v4a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11"/><circle cx="16.2" cy="10" r="1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
  map:'<path d="M9 19l-6 2V6l6-2 6 2 6-2v15l-6 2-6-2z"/><path d="M9 4v15M15 6v15"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 19h16"/>',
  share:'<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.6l7.4-4.2M8.3 13.4l7.4 4.2"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  mail:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  phone:'<path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.6 22 2 14.4 2 6a2 2 0 0 1 2-2z"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5.5-5.5L4 21"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  alert:'<path d="M12 2 1 21h22z"/><path d="M12 9v5M12 17h.01"/>',
  building:'<path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/>',
  truck:'<path d="M2 15l1-6a2 2 0 0 1 2-2h6v9"/><path d="M11 8h5l4 4v4h-9z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  tool:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/>',
  music:'<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/>',
  shirt:'<path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7z"/>',
  video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/>',
  ellipse:'<path d="M20 6L9 17l-5-5"/>',
};
function icon(name,{size=18,stroke=2,fill=false,cls=''}={}){
  const d=ICONS[name]||ICONS.info;
  return `<svg class="icon ${cls}" style="width:${size}px;height:${size}px" viewBox="0 0 24 24" fill="${fill?'currentColor':'none'}" stroke="${fill?'none':'currentColor'}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function starIcon(size=13){return icon('star',{size,fill:true,cls:'star-fill'});}

/* ---------------- DUOTONE "photography" (no stock images, consistent hand) ---------------- */
const DUOTONE = {
  event:      ['#C97B4A','#EFD9BE'],
  vehicle:    ['#151A22','#5B6B82'],
  realestate: ['#41523F','#CBD3B9'],
  tools:      ['#7A4A1E','#E3AE5C'],
  av:         ['#26262A','#7C7C84'],
  music:      ['#3B2A52','#9A7FC2'],
  clothing:   ['#7A2E42','#E8A9B8'],
  provider:   ['#1B2B29','#5C9E8C'],
  spaces:     ['#2E3A52','#9BAAC9'],
  boats:      ['#0E3A4A','#6FB3C4'],
  sports:     ['#3E1F0F','#D98A4C'],
  hero:       ['#20242B','#7D8A9E'],
};
const SIL = {
  event: ICONS.calendar.replace(/<rect[^>]*x="3"[^>]*\/>/,'')+'<path d="M12 3l9 8h-4v10H7V11H3z"/>',
  vehicle: ICONS.truck,
  realestate: ICONS.building,
  tools: ICONS.tool,
  av: ICONS.video,
  music: ICONS.music,
  clothing: ICONS.shirt,
  provider: ICONS.check,
  spaces: ICONS.home,
  boats:'<path d="M2 18l2-8h16l2 8"/><path d="M6 10V4h8l2 6"/><path d="M2 18c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/>',
  sports:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/>',
  hero: ICONS.image,
};
/* Real photography, sourced free-license from Unsplash, one representative
   shot per category — living under assets/images/. Categories without a
   sourced photo fall back to the duotone mark so nothing ever renders blank. */
const PHOTOS = new Set(['event','vehicle','realestate','tools','av','music','clothing','sports','boats','spaces','provider','hero']);
function hasPhoto(key){ return PHOTOS.has(key); }
function photoTag(key,{position='50% 50%',zoom=1}={}){
  return `<img src="assets/images/${key}.jpg" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${position};transform:scale(${zoom});">`;
}
function artStyle(key){
  const c=DUOTONE[key]||DUOTONE.hero;
  return `background:linear-gradient(155deg,${c[0]} 0%,${c[1]} 100%);`;
}
function artHTML(key,iconSize=90,opacity=.2){
  if(hasPhoto(key)) return photoTag(key);
  const path=SIL[key]||SIL.hero;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"
    style="position:absolute;width:${iconSize}%;height:${iconSize}%;top:50%;left:58%;transform:translate(-50%,-50%) rotate(-8deg);opacity:${opacity}">${path}</svg>`;
}
function paintArt(el,key,iconSize=120,opacity=.2){
  if(!el) return;
  el.style.cssText+=artStyle(key);
  el.innerHTML=artHTML(key,iconSize,opacity);
}
function artDiv(key,iconSize=100,opacity=.18){
  return `<div class="art" style="${artStyle(key)}">${artHTML(key,iconSize,opacity)}</div>`;
}

/* ---------------- FORMAT HELPERS ---------------- */
function money(n){return '₦'+Math.round(n).toLocaleString('en-NG');}
function initials(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}

/* ---------------- MOCK DATA ---------------- */
const CATEGORIES=[
  {key:'event',name:'Event & Party',count:1240,size:'c-large'},
  {key:'vehicle',name:'Vehicles',count:380,size:'c-med'},
  {key:'realestate',name:'Real Estate & Spaces',count:610,size:'c-small'},
  {key:'tools',name:'Tools & Construction',count:890,size:'c-small'},
  {key:'av',name:'AV Equipment',count:520,size:'c-med'},
  {key:'music',name:'Musical Instruments',count:260,size:'c-small'},
  {key:'clothing',name:'Fashion & Attire',count:175,size:'c-small'},
  {key:'sports',name:'Sports & Leisure',count:140,size:'c-small'},
  {key:'boats',name:'Marine & Watercraft',count:38,size:'c-small'},
  {key:'spaces',name:'Studios & Workspaces',count:210,size:'c-small'},
];
const CATEGORY_ICON={event:'calendar',vehicle:'truck',realestate:'building',tools:'tool',av:'video',music:'music',clothing:'shirt',sports:'star',boats:'map',spaces:'grid'};

const PROVIDERS=[
  {id:'ec',name:'EventCraft NG',avatar:'EC',verified:true,since:2022,responseTime:'< 2 hrs',rating:4.8,listings:34,bio:'Full-service event infrastructure — tents, drapery, staging and décor for weddings and corporate functions across Lagos.'},
  {id:'al',name:'AeroLens Rentals',avatar:'AL',verified:true,since:2023,responseTime:'< 1 hr',rating:4.7,listings:12,bio:'Cinema and broadcast-grade drone and gimbal equipment, maintained and insured for commercial shoots.'},
  {id:'pa',name:'Prestige Auto',avatar:'PA',verified:true,since:2021,responseTime:'< 3 hrs',rating:5.0,listings:9,bio:'Curated fleet of exotic and luxury vehicles, self-drive or chauffeured, fully insured.'},
  {id:'us',name:'UrbanStay Lekki',avatar:'US',verified:true,since:2022,responseTime:'< 4 hrs',rating:4.6,listings:6,bio:'Boutique shortlet apartments across Lekki and Victoria Island, professionally managed.'},
  {id:'sw',name:'SoundWave Pro',avatar:'SW',verified:true,since:2020,responseTime:'< 2 hrs',rating:4.9,listings:21,bio:'Professional sound reinforcement and DJ equipment for events of every scale.'},
  {id:'br',name:'BuildRight Equipment',avatar:'BR',verified:true,since:2021,responseTime:'< 6 hrs',rating:4.5,listings:47,bio:'Construction and scaffolding equipment for contractors, rented by the day or the project.'},
  {id:'cp',name:'Canon Pro Rentals',avatar:'CP',verified:true,since:2023,responseTime:'< 2 hrs',rating:4.8,listings:15,bio:'Professional camera and lens kits maintained to broadcast standard.'},
  {id:'pg',name:'PowerGen Rentals',avatar:'PG',verified:true,since:2020,responseTime:'< 3 hrs',rating:4.7,listings:28,bio:'Soundproof and industrial generators for events, construction sites and homes — maintained and delivered nationwide.'},
  {id:'ap',name:'Abuja Party Hire',avatar:'AH',verified:true,since:2022,responseTime:'< 3 hrs',rating:4.7,listings:22,bio:'Abuja\'s go-to for event essentials — canopies, chairs, tables and décor for weddings, naming ceremonies and corporate events.'},
];

const LISTINGS=[
  {id:'l1',title:'Premium Event Tent & Décor Package',cat:'event',catName:'Event & Party',price:45000,unit:'day',rating:4.8,reviews:120,loc:'Lekki, Lagos',providerId:'ec',provider:'EventCraft NG',pAvatar:'EC',verified:true,mode:'request',deposit:20000,delivery:true,availability:'available',desc:'A complete 20×30ft weatherproof event setup with elegant drapery and coordinated décor — delivery and setup crew included.',specs:['20×30ft weatherproof marquee','Full drapery & lighting rig','Setup and breakdown crew included','Seats up to 150 guests']},
  {id:'l2',title:'DJI Mavic 3 Pro Drone Kit',cat:'av',catName:'AV Equipment',price:25000,unit:'day',rating:4.7,reviews:86,loc:'Victoria Island, Lagos',providerId:'al',provider:'AeroLens Rentals',pAvatar:'AL',verified:true,mode:'instant',deposit:50000,delivery:true,availability:'available',desc:'Cinema-grade 5.1K drone with 3 batteries, ND filters and a hard case — ideal for weddings and real estate shoots.',specs:['5.1K/50fps Hasselblad camera','3 batteries (~135 min total flight)','ND filter set + hard case','Insured against accidental damage']},
  {id:'l3',title:'Lamborghini Huracán EVO',cat:'vehicle',catName:'Vehicles',price:250000,unit:'day',rating:5.0,reviews:22,loc:'Banana Island, Lagos',providerId:'pa',provider:'Prestige Auto',pAvatar:'PA',verified:true,mode:'request',deposit:500000,delivery:false,availability:'limited',desc:'Self-drive or chauffeured, fully insured, 100km/day included. Turn heads at your next event.',specs:['630hp V10, self-drive or chauffeured','100km/day included, ₦850/km after','Comprehensive insurance included','Valid driver\'s licence + ₦500,000 deposit']},
  {id:'l4',title:'Furnished 2-Bed Shortlet Apartment',cat:'realestate',catName:'Real Estate & Spaces',price:60000,unit:'night',rating:4.6,reviews:98,loc:'Lekki Phase 1, Lagos',providerId:'us',provider:'UrbanStay Lekki',pAvatar:'US',verified:true,mode:'instant',deposit:30000,delivery:false,availability:'available',desc:'Bright, fully furnished, gated estate with a private pool and 24/7 power — walking distance to the beach.',specs:['2 bedrooms, sleeps 4','Private pool, 24/7 power & water','Gated estate with security','5 min walk to the beach']},
  {id:'l5',title:'Professional PA & DJ Equipment Set',cat:'music',catName:'Musical Instruments',price:35000,unit:'day',rating:4.9,reviews:64,loc:'Ikeja, Lagos',providerId:'sw',provider:'SoundWave Pro',pAvatar:'SW',verified:true,mode:'instant',deposit:15000,delivery:true,availability:'available',desc:'Dual 15" active speakers, wireless mics and a Pioneer controller — sound for up to 300 guests.',specs:['2× 15" active speakers, 2400W','Pioneer DDJ controller','2 wireless handheld mics','Delivery available within Lagos']},
  {id:'l6',title:'Heavy-Duty Scaffolding Set',cat:'tools',catName:'Tools & Construction',price:18000,unit:'day',rating:4.5,reviews:41,loc:'Ajah, Lagos',providerId:'br',provider:'BuildRight Equipment',pAvatar:'BR',verified:true,mode:'request',deposit:25000,delivery:true,availability:'available',desc:'Galvanized full-bay scaffolding with guard rails, suitable for facades up to 4 storeys.',specs:['Galvanized steel, corrosion resistant','Guard rails on every level','Suitable up to 4 storeys','Transport quoted separately']},
  {id:'l7',title:'Canon EOS R5 + L-Series Kit',cat:'av',catName:'AV Equipment',price:30000,unit:'day',rating:4.8,reviews:73,loc:'Yaba, Lagos',providerId:'cp',provider:'Canon Pro Rentals',pAvatar:'CP',verified:true,mode:'instant',deposit:60000,delivery:true,availability:'available',desc:'Full-frame body with 24-70mm and 70-200mm L lenses, extra batteries and a 128GB card.',specs:['45MP full-frame, 8K RAW video','24-70mm f/2.8L + 70-200mm f/2.8L','3 batteries, 128GB CFexpress','Padded hard case included']},
  {id:'l8',title:'Rooftop Event Space, Victoria Island',cat:'realestate',catName:'Real Estate & Spaces',price:120000,unit:'day',rating:4.7,reviews:31,loc:'Victoria Island, Lagos',providerId:'us',provider:'UrbanStay Lekki',pAvatar:'US',verified:true,mode:'request',deposit:60000,delivery:false,availability:'available',desc:'Skyline-view rooftop with in-house lighting rig, ideal for launches and intimate receptions of up to 80.',specs:['Capacity up to 80 guests','In-house lighting & PA hookup','Backup generator on site','Caterer-friendly service lift']},
  {id:'l9',title:'Tailored Agbada, 3-Piece',cat:'clothing',catName:'Fashion & Attire',price:20000,unit:'day',rating:4.9,reviews:19,loc:'Ikoyi, Lagos',providerId:'ec',provider:'EventCraft NG',pAvatar:'EC',verified:true,mode:'instant',deposit:10000,delivery:true,availability:'available',desc:'Hand-embroidered 3-piece agbada, dry-cleaned and pressed before every booking.',specs:['Hand embroidery, made to measure sizing','Dry-cleaned before every rental','Comes with matching cap','48hr notice for alterations']},
  {id:'l10',title:'Toyota Hiace Event Shuttle Bus',cat:'vehicle',catName:'Vehicles',price:65000,unit:'day',rating:4.6,reviews:38,loc:'Ikeja, Lagos',providerId:'pa',provider:'Prestige Auto',pAvatar:'PA',verified:true,mode:'request',deposit:40000,delivery:false,availability:'available',desc:'18-seater with driver, air conditioning, ideal for wedding guest shuttling and corporate transport.',specs:['18 seats, driver included','Air conditioned','200km/day included','Fuel billed separately']},
  {id:'l11',title:'Yamaha Grand Piano, Studio Upright',cat:'music',catName:'Musical Instruments',price:28000,unit:'day',rating:4.9,reviews:14,loc:'Victoria Island, Lagos',providerId:'sw',provider:'SoundWave Pro',pAvatar:'SW',verified:true,mode:'request',deposit:80000,delivery:true,availability:'limited',desc:'Freshly tuned studio upright, moved and tuned on-site by our technician for the duration of your rental.',specs:['Tuned on delivery','Professional movers included','Climate-stable transport','Insurance included in price']},
  {id:'l12',title:'42ft Speedboat Charter, Half Day',cat:'boats',catName:'Marine & Watercraft',price:180000,unit:'day',rating:4.8,reviews:27,loc:'Ikoyi, Lagos',providerId:'pa',provider:'Prestige Auto',pAvatar:'PA',verified:true,mode:'request',deposit:100000,delivery:false,availability:'available',desc:'Captain-operated 42ft speedboat, life jackets and cooler included, half-day charter around Lagos waterways.',specs:['Captain & crew included','Life jackets for up to 12','Cooler and bluetooth sound system','Fuel included up to 3 hours']},
  {id:'l13',title:'Toyota Hilux Pickup Truck',cat:'vehicle',catName:'Vehicles',price:40000,unit:'day',rating:4.6,reviews:47,loc:'Ojo, Lagos',providerId:'pa',provider:'Prestige Auto',pAvatar:'PA',verified:true,mode:'instant',deposit:35000,delivery:false,availability:'available',desc:'Double-cab 4x4 pickup with an open bed, ideal for moving furniture, building materials or market goods across town.',specs:['Double-cab, 4x4, manual','1-tonne open bed capacity','150km/day included','Driver available on request']},
  {id:'l14',title:'Mercedes-Benz Sprinter Cargo Van',cat:'vehicle',catName:'Vehicles',price:45000,unit:'day',rating:4.7,reviews:33,loc:'Apapa, Lagos',providerId:'pa',provider:'Prestige Auto',pAvatar:'PA',verified:true,mode:'request',deposit:40000,delivery:false,availability:'available',desc:'Enclosed cargo van for house moves, event logistics or bulk deliveries — loading assistance available on request.',specs:['11m³ enclosed cargo space','Loading assistance available','150km/day included','Driver included']},
  {id:'l15',title:'Massey Ferguson Farm Tractor',cat:'tools',catName:'Tools & Construction',price:70000,unit:'day',rating:4.6,reviews:18,loc:'Epe, Lagos',providerId:'br',provider:'BuildRight Equipment',pAvatar:'BR',verified:true,mode:'request',deposit:100000,delivery:true,availability:'available',desc:'75HP tractor with plough and harrow attachments, operator included — suited to land clearing and farm preparation.',specs:['75HP, plough & harrow attachments','Trained operator included','Fuel billed separately','Suitable for land clearing & tilling']},
  {id:'l16',title:'Canopy, Chairs & Tables Package (100 Guests)',cat:'event',catName:'Event & Party',price:28000,unit:'day',rating:4.7,reviews:56,loc:'Ajah, Lagos',providerId:'ec',provider:'EventCraft NG',pAvatar:'EC',verified:true,mode:'instant',deposit:12000,delivery:true,availability:'available',desc:'The everyday event essentials — a durable canopy, plastic chairs and round tables for up to 100 guests, delivered and set up.',specs:['Canopy for up to 100 guests','100 plastic chairs, 10 round tables','Delivery and setup included','Pickup the next day']},
  {id:'l17',title:'Electric Concrete Mixer (140L)',cat:'tools',catName:'Tools & Construction',price:13000,unit:'day',rating:4.4,reviews:29,loc:'Ikorodu, Lagos',providerId:'br',provider:'BuildRight Equipment',pAvatar:'BR',verified:true,mode:'instant',deposit:15000,delivery:true,availability:'available',desc:'140-litre electric concrete mixer, well maintained and tested before every rental — ideal for small to mid-size building projects.',specs:['140-litre drum capacity','Single-phase electric motor','Tested before every rental','Transport quoted separately']},
  {id:'l18',title:'500 White Plastic Chairs',cat:'event',catName:'Event & Party',price:15000,unit:'day',rating:4.6,reviews:88,loc:'Ikeja, Lagos',providerId:'ec',provider:'EventCraft NG',pAvatar:'EC',verified:true,mode:'instant',deposit:8000,delivery:true,availability:'available',desc:'500 sturdy white plastic chairs, cleaned and delivered — perfect for weddings, church programmes and large gatherings.',specs:['500 chairs, white plastic','Delivery and pickup included','Cleaned before every rental','Extra chairs available on request']},
  {id:'l19',title:'Round Banquet Tables (Set of 20)',cat:'event',catName:'Event & Party',price:20000,unit:'day',rating:4.7,reviews:41,loc:'Wuse II, Abuja',providerId:'ap',provider:'Abuja Party Hire',pAvatar:'AH',verified:true,mode:'instant',deposit:10000,delivery:true,availability:'available',desc:'20 round banquet tables (seats 10 each) with white linen covers, delivered and set up at your venue.',specs:['20 tables, seats 10 each','White linen covers included','Delivery and setup included','Ideal for weddings & receptions']},
  {id:'l20',title:'Wedding Decoration & Backdrop Package',cat:'event',catName:'Event & Party',price:150000,unit:'day',rating:4.9,reviews:37,loc:'Bodija, Ibadan',providerId:'ec',provider:'EventCraft NG',pAvatar:'EC',verified:true,mode:'request',deposit:50000,delivery:true,availability:'limited',desc:'Full wedding styling — floral backdrop, aisle runner, stage décor and lighting, designed and installed by our team.',specs:['Custom floral backdrop & stage décor','Aisle runner and lighting included','Design consultation included','Installed the day before your event']},
  {id:'l21',title:'10KVA Soundproof Generator',cat:'tools',catName:'Tools & Construction',price:25000,unit:'day',rating:4.8,reviews:102,loc:'Yaba, Lagos',providerId:'pg',provider:'PowerGen Rentals',pAvatar:'PG',verified:true,mode:'instant',deposit:20000,delivery:true,availability:'available',desc:'Soundproof 10KVA generator with a full tank, ideal for events and homes during extended power outages.',specs:['10KVA, soundproof canopy','Delivered with a full tank','Fuel top-up available on request','24hr support line for breakdowns']},
  {id:'l22',title:'20KVA Industrial Generator',cat:'tools',catName:'Tools & Construction',price:45000,unit:'day',rating:4.7,reviews:34,loc:'Sabon Gari, Kano',providerId:'pg',provider:'PowerGen Rentals',pAvatar:'PG',verified:true,mode:'request',deposit:40000,delivery:true,availability:'available',desc:'Heavy-duty 20KVA generator for construction sites and large events, delivered with a trained technician on standby.',specs:['20KVA, diesel','Technician on standby','Delivered and installed','Fuel billed separately']},
  {id:'l23',title:'Bouncy Castle (Kids Party)',cat:'event',catName:'Event & Party',price:22000,unit:'day',rating:4.6,reviews:29,loc:'Independence Layout, Enugu',providerId:'ap',provider:'Abuja Party Hire',pAvatar:'AH',verified:true,mode:'instant',deposit:10000,delivery:true,availability:'available',desc:'Colourful inflatable bouncy castle with an attendant, delivered, set up and collected the same day.',specs:['Holds up to 8 children at a time','On-site attendant included','Delivery, setup & collection included','Generator available on request']},
  {id:'l24',title:'HD Projector & 120" Screen',cat:'av',catName:'AV Equipment',price:20000,unit:'day',rating:4.6,reviews:24,loc:'GRA, Port Harcourt',providerId:'cp',provider:'Canon Pro Rentals',pAvatar:'CP',verified:true,mode:'instant',deposit:15000,delivery:true,availability:'available',desc:'Bright 6000-lumen projector with a 120" screen, HDMI and sound bar included — ready for conferences or outdoor movie nights.',specs:['6000-lumen HD projector','120" portable screen','HDMI, sound bar included','Delivery & setup available']},
  {id:'l25',title:'Sony FX6 Cinema Camera Kit',cat:'av',catName:'AV Equipment',price:55000,unit:'day',rating:4.9,reviews:16,loc:'Lekki, Lagos',providerId:'cp',provider:'Canon Pro Rentals',pAvatar:'CP',verified:true,mode:'request',deposit:120000,delivery:true,availability:'limited',desc:'Full-frame cinema camera with a prime lens set, tripod and audio kit — built for commercial and broadcast shoots.',specs:['Full-frame 4K/120fps cinema body','Prime lens set + tripod','Wireless audio kit included','Insured against accidental damage']},
  {id:'l26',title:'Toyota Camry (Self-Drive or Chauffeured)',cat:'vehicle',catName:'Vehicles',price:30000,unit:'day',rating:4.6,reviews:61,loc:'GRA, Benin City',providerId:'pa',provider:'Prestige Auto',pAvatar:'PA',verified:true,mode:'instant',deposit:50000,delivery:false,availability:'available',desc:'Comfortable, fuel-efficient sedan for everyday trips, airport runs or a weekend away — self-drive or with a driver.',specs:['Self-drive or chauffeured','100km/day included','Comprehensive insurance included','Valid driver\'s licence required for self-drive']},
  {id:'l27',title:'Furnished Studio Apartment, Wuse',cat:'realestate',catName:'Real Estate & Spaces',price:35000,unit:'night',rating:4.5,reviews:22,loc:'Wuse II, Abuja',providerId:'us',provider:'UrbanStay Lekki',pAvatar:'US',verified:true,mode:'instant',deposit:20000,delivery:false,availability:'available',desc:'Cosy, fully furnished studio in the heart of Abuja — fast wifi, 24/7 power and walking distance to the city centre.',specs:['Studio, sleeps 2','Fast wifi & 24/7 power','Self check-in','Walking distance to the city centre']},
  {id:'l28',title:'Arc Welding Machine',cat:'tools',catName:'Tools & Construction',price:12000,unit:'day',rating:4.4,reviews:19,loc:'Oke-Ilewo, Abeokuta',providerId:'br',provider:'BuildRight Equipment',pAvatar:'BR',verified:true,mode:'instant',deposit:15000,delivery:true,availability:'available',desc:'Portable arc welding machine with rods included, tested before every rental — suited to fabrication and repair work.',specs:['Portable, single-phase','Welding rods included','Tested before every rental','Transport quoted separately']},
  {id:'l29',title:'Line Array PA System (Large Event)',cat:'music',catName:'Musical Instruments',price:80000,unit:'day',rating:4.8,reviews:21,loc:'Trans Amadi, Port Harcourt',providerId:'sw',provider:'SoundWave Pro',pAvatar:'SW',verified:true,mode:'request',deposit:60000,delivery:true,availability:'available',desc:'Line array system built for 500+ guests, with a sound engineer included for setup and the duration of your event.',specs:['Line array, 500+ guest capacity','Sound engineer included','Wireless mic set included','Delivery & rigging included']},
];

const BOOKINGS=[
  {id:'b1',listingId:'l4',title:'Furnished 2-Bed Shortlet Apartment',cat:'realestate',status:'upcoming',stage:'reserved',dateFrom:'2026-07-18',dateTo:'2026-07-21',total:180000,provider:'UrbanStay Lekki',deposit:30000,depositStatus:'held'},
  {id:'b2',listingId:'l2',title:'DJI Mavic 3 Pro Drone Kit',cat:'av',status:'completed',stage:'completed',dateFrom:'2026-06-02',dateTo:'2026-06-03',total:50000,provider:'AeroLens Rentals',deposit:50000,depositStatus:'released'},
  {id:'b3',listingId:'l1',title:'Premium Event Tent & Décor Package',cat:'event',status:'pending',stage:'requested',dateFrom:'2026-08-09',dateTo:'2026-08-10',total:90000,provider:'EventCraft NG',deposit:20000,depositStatus:'held'},
  {id:'b4',listingId:'l7',title:'Canon EOS R5 + L-Series Kit',cat:'av',status:'completed',stage:'completed',dateFrom:'2026-05-14',dateTo:'2026-05-15',total:30000,provider:'Canon Pro Rentals',deposit:60000,depositStatus:'released'},
  {id:'b5',listingId:'l6',title:'Heavy-Duty Scaffolding Set',cat:'tools',status:'cancelled',stage:'cancelled',dateFrom:'2026-04-02',dateTo:'2026-04-05',total:54000,provider:'BuildRight Equipment',deposit:25000,depositStatus:'refunded'},
  {id:'b6',listingId:'l21',title:'10KVA Soundproof Generator',cat:'tools',status:'active',stage:'active',dateFrom:'2026-07-08',dateTo:'2026-07-11',total:75000,provider:'PowerGen Rentals',deposit:20000,depositStatus:'held'},
];

const PROVIDER_LISTINGS=[
  {id:'l1',title:'Premium Event Tent & Décor Package',cat:'event',price:45000,status:'live',views:1240,bookings:34},
  {id:'l9',title:'Tailored Agbada, 3-Piece',cat:'clothing',price:20000,status:'live',views:310,bookings:19},
  {id:'l8b',title:'Marquee Lighting Rig, Warm White',cat:'event',price:22000,status:'paused',views:96,bookings:4},
  {id:'l1c',title:'Chiavari Chairs (Set of 100)',cat:'event',price:15000,status:'draft',views:0,bookings:0},
];

const PROVIDER_REQUESTS=[
  {id:'r1',renter:'Ifeoma A.',renterAvatar:'IA',listing:'Premium Event Tent & Décor Package',dateFrom:'2026-08-09',dateTo:'2026-08-10',total:90000,status:'pending'},
  {id:'r2',renter:'Tunde B.',renterAvatar:'TB',listing:'Premium Event Tent & Décor Package',dateFrom:'2026-07-22',dateTo:'2026-07-23',total:45000,status:'pending'},
  {id:'r3',renter:'Chioma O.',renterAvatar:'CO',listing:'Tailored Agbada, 3-Piece',dateFrom:'2026-07-15',dateTo:'2026-07-16',total:20000,status:'approved'},
];

/* What a provider sees for rentals currently in progress — distinct from
   PROVIDER_REQUESTS (not-yet-approved) and from BOOKINGS (the renter's own
   view of their bookings). Stage mirrors the shared STAGES model, collapsed
   to the handful a provider actually has to act on. */
const PROVIDER_ACTIVE_RENTALS=[
  {id:'ar1',listingId:'l1',cat:'event',title:'Premium Event Tent & Décor Package',renter:'Bola S.',renterAvatar:'BS',dateFrom:'2026-07-07',dateTo:'2026-07-10',stage:'active',deposit:20000},
  {id:'ar2',listingId:'l18',cat:'event',title:'500 White Plastic Chairs',renter:'Tunde B.',renterAvatar:'TB',dateFrom:'2026-07-09',dateTo:'2026-07-09',stage:'ready',deposit:8000},
  {id:'ar3',listingId:'l16',cat:'event',title:'Canopy, Chairs & Tables Package',renter:'Chioma O.',renterAvatar:'CO',dateFrom:'2026-07-05',dateTo:'2026-07-08',stage:'returnsched',deposit:12000},
  {id:'ar4',listingId:'l9',cat:'clothing',title:'Tailored Agbada, 3-Piece',renter:'Femi K.',renterAvatar:'FK',dateFrom:'2026-06-28',dateTo:'2026-06-30',stage:'returned',deposit:10000},
];

const TRANSACTIONS=[
  {date:'2026-07-01',listing:'Premium Event Tent & Décor Package',renter:'Bola S.',amount:90000,commission:4500,status:'paid',payout:'2026-07-08'},
  {date:'2026-06-24',listing:'Tailored Agbada, 3-Piece',renter:'Chioma O.',amount:20000,commission:1000,status:'paid',payout:'2026-07-01'},
  {date:'2026-06-18',listing:'Premium Event Tent & Décor Package',renter:'Femi K.',amount:45000,commission:2250,status:'paid',payout:'2026-06-25'},
  {date:'2026-06-05',listing:'Marquee Lighting Rig, Warm White',renter:'Ada N.',amount:22000,commission:1100,status:'pending',payout:'2026-07-12'},
];

const CURRENT_USER={name:'Damilola Adeyemi',email:'damilola.a@gmail.com',avatar:'DA',since:2024};

const RECENT_SEARCHES=['Event tents in Lekki','DJI drone this weekend','2-bed shortlet, VI'];
const POPULAR_SEARCHES=['Generator','Plastic chairs','Canopy & chairs','Sound system','Wedding decoration','Bouncy castle'];
const LOCATIONS=[['Lekki Phase 1','Lagos'],['Victoria Island','Lagos'],['Ikeja','Lagos'],['Ajah','Lagos'],['Yaba','Lagos'],['Banana Island','Lagos'],['Wuse II','Abuja'],['Garki','Abuja'],['Maitama','Abuja'],['GRA','Port Harcourt'],['Trans Amadi','Port Harcourt'],['Bodija','Ibadan'],['Ring Road','Ibadan'],['Sabon Gari','Kano'],['Independence Layout','Enugu'],['GRA','Benin City'],['Oke-Ilewo','Abeokuta']];

/* ---------------- LISTING CARD RENDERER (shared) ---------------- */
function rcard(l,feature=false,opts={}){
  const href=opts.href!==undefined?opts.href:`listing?id=${l.id}`;
  return `<a class="rcard ${feature?'feature':''}" href="${href}">
    <div class="rcard-media">
      ${artDiv(l.cat,feature?90:100,.18)}
      <div class="rcard-top">
        <div class="badge-row">${l.verified?`<div class="badge float verified">${icon('check',{size:11,stroke:2.6})}Verified</div>`:''}${l.mode==='instant'?`<div class="badge float instant">${icon('check',{size:11,stroke:2.6})}Instant Book</div>`:''}${l.availability==='limited'?`<div class="badge float request">${icon('alert',{size:11,stroke:2.6})}Few left</div>`:''}</div>
        <div class="fav-btn" onclick="event.preventDefault();event.stopPropagation();this.classList.toggle('on')">${icon('heart',{size:15})}</div>
      </div>
    </div>
    <div class="rcard-body">
      <div class="rcard-row1">
        <div class="rcard-title">${l.title}</div>
        <div class="rrating">${starIcon(13)}${l.rating}</div>
      </div>
      <div class="rcard-meta">${icon('pin',{size:12})}${l.loc} · ${l.catName}</div>
      <div class="rcard-foot">
        <div class="provider-mini"><div class="p-avatar">${l.pAvatar}</div><div class="p-name">${l.provider}</div></div>
        <div class="rprice">${money(l.price)}<span>/${l.unit}</span></div>
      </div>
    </div>
  </a>`;
}

/* ================================================================
   BOOKING LIFECYCLE — the 12-stage timeline every booking moves
   through, from request to closed-out deposit. Shared by the booking
   tracking page and, in summary form, by the provider/renter
   dashboards.
   ================================================================ */
const STAGES=[
  {key:'requested',label:'Booking Requested',desc:'Your request was sent to the provider.',offsetDays:-5},
  {key:'accepted',label:'Provider Accepted',desc:'The provider approved your request.',offsetDays:-4.7},
  {key:'payment',label:'Payment Completed',desc:'Your payment was captured and held in escrow.',offsetDays:-4.6},
  {key:'reserved',label:'Item Reserved',desc:'This item is blocked out on the provider\'s calendar for your dates.',offsetDays:-4.5},
  {key:'ready',label:'Ready for Pickup',desc:'The provider has prepared the item for handover.',offsetDays:-0.15},
  {key:'pickedup',label:'Picked Up',desc:'Handover confirmed — your rental period has started.',offsetDays:0},
  {key:'active',label:'Rental Active',desc:'You have the item. Extensions and support are available below.',offsetDays:0.1},
  {key:'returnsched',label:'Return Scheduled',desc:'A return appointment has been arranged with the provider.',offsetFromEnd:-0.3},
  {key:'returned',label:'Returned',desc:'The item was handed back to the provider.',offsetFromEnd:0},
  {key:'inspected',label:'Inspection Completed',desc:'The provider checked the item against the pickup condition report.',offsetFromEnd:0.25},
  {key:'depositreleased',label:'Deposit Released',desc:'Your security deposit has been refunded.',offsetFromEnd:0.9},
  {key:'completed',label:'Completed',desc:'This booking is closed. Thank you for renting with Rently.',offsetFromEnd:1.1},
];
function stageIdx(key){ return STAGES.findIndex(s=>s.key===key); }
function stageDate(booking,stage){
  const from=new Date(booking.dateFrom+'T10:00:00');
  const to=new Date(booking.dateTo+'T17:00:00');
  return stage.offsetDays!==undefined
    ? new Date(from.getTime()+stage.offsetDays*86400000)
    : new Date(to.getTime()+stage.offsetFromEnd*86400000);
}
function fmtStageTime(d){
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function renderStageTimeline(booking,currentKey){
  const curIdx=stageIdx(currentKey);
  return STAGES.map((s,i)=>{
    const state = i<curIdx?'done':(i===curIdx?'active':'upcoming');
    const time = i<=curIdx ? fmtStageTime(stageDate(booking,s)) : '';
    const circ = state==='done' ? icon('check',{size:12,stroke:3}) : (i+1);
    const line = i<STAGES.length-1 ? `<div class="tl-line ${i<curIdx?'done':''}"></div>` : '';
    return `<div class="tl-item ${state}">
      <div class="tl-marker"><div class="tl-circ">${circ}</div>${line}</div>
      <div class="tl-body">
        <div class="tl-label">${s.label}</div>
        <div class="tl-time ${time?'':'muted'}">${time||'—'}</div>
        <div class="tl-desc">${s.desc}</div>
      </div>
    </div>`;
  }).join('');
}

/* ---------------- REVEAL ON SCROLL ---------------- */
function initReveal(){
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){en.target.classList.add('in'); io.unobserve(en.target);} });
  },{threshold:.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}

/* ---------------- MARKETING NAV: solid-on-scroll + mini search reveal ---------------- */
function initMarketingNav(){
  const nav=document.getElementById('nav');
  if(!nav) return;
  const navMini=document.getElementById('navSearchMini');
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    if(y>window.innerHeight*0.75){nav.classList.add('solid');nav.classList.remove('on-dark');}
    else{nav.classList.remove('solid');if(nav.dataset.onDark!=='false')nav.classList.add('on-dark');}
    if(navMini){ if(y>window.innerHeight*0.6){navMini.classList.add('show');} else {navMini.classList.remove('show');} }
  });
  if(navMini) navMini.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}

/* ---------------- AVATAR DROPDOWN (app nav) ---------------- */
function initAvatarMenu(btnId='avatarBtn',ddId='avatarDropdown'){
  const btn=document.getElementById(btnId), dd=document.getElementById(ddId);
  if(!btn||!dd) return;
  btn.addEventListener('click',(e)=>{e.stopPropagation();dd.classList.toggle('open');});
  document.addEventListener('click',(e)=>{ if(!e.target.closest(`#${ddId}`) && !e.target.closest(`#${btnId}`)) dd.classList.remove('open'); });
}

/* ---------------- NOTIFICATION CENTER (bell dropdown, app nav) ---------------- */
const NOTIFICATIONS=[
  {icon:'check',type:'success',title:'Booking accepted',body:'EventCraft NG approved your request for Premium Event Tent & Décor Package.',time:'2h ago',unread:true},
  {icon:'wallet',type:'info',title:'Payment received',body:'Your payment of ₦79,500 was captured and held in escrow.',time:'2h ago',unread:true},
  {icon:'check',type:'success',title:'Item ready for pickup',body:'Your 10KVA Soundproof Generator is ready — show your QR code at pickup.',time:'1d ago',unread:true},
  {icon:'clock',type:'warning',title:'Pickup reminder',body:'Pickup for your Furnished 2-Bed Shortlet Apartment is tomorrow at 10:00 AM.',time:'1d ago',unread:false},
  {icon:'check',type:'success',title:'Rental started',body:'Handover confirmed for 10KVA Soundproof Generator — enjoy!',time:'2d ago',unread:false},
  {icon:'clock',type:'warning',title:'Return reminder',body:'Your Canopy, Chairs & Tables Package is due back in 24 hours.',time:'3d ago',unread:false},
  {icon:'alert',type:'danger',title:'Late return warning',body:'Heavy-Duty Scaffolding Set was due back yesterday — a late fee may apply.',time:'4d ago',unread:false},
  {icon:'wallet',type:'success',title:'Deposit released',body:'Your ₦50,000 deposit for DJI Mavic 3 Pro Drone Kit has been refunded.',time:'1w ago',unread:false},
  {icon:'star',type:'info',title:'Review request',body:'How was your experience with Canon Pro Rentals? Leave a review.',time:'1w ago',unread:false},
];
function renderNotifDropdown(){
  const list=document.getElementById('notifList');
  if(!list) return;
  list.innerHTML = NOTIFICATIONS.length ? NOTIFICATIONS.map(n=>`
    <div class="notif-item ${n.unread?'unread':''}">
      <div class="ic ${n.type}">${icon(n.icon,{size:15})}</div>
      <div><div class="t">${n.title}</div><div class="b">${n.body}</div><div class="tm">${n.time}</div></div>
    </div>`).join('') : `<div class="notif-empty">You're all caught up.</div>`;
  const bellDot=document.querySelector('#bellBtn .dot');
  if(bellDot) bellDot.style.display = NOTIFICATIONS.some(n=>n.unread) ? 'block' : 'none';
}
function initNotifDropdown(){
  const btn=document.getElementById('bellBtn'), dd=document.getElementById('notifDropdown');
  if(!btn||!dd) return;
  renderNotifDropdown();
  btn.addEventListener('click',(e)=>{e.stopPropagation();dd.classList.toggle('open');});
  document.getElementById('markAllReadBtn')?.addEventListener('click',()=>{ NOTIFICATIONS.forEach(n=>n.unread=false); renderNotifDropdown(); });
  document.addEventListener('click',(e)=>{ if(!e.target.closest('#notifDropdown') && !e.target.closest('#bellBtn')) dd.classList.remove('open'); });
}

/* ---------------- DATE RANGE PICKER (factory) ----------------
   Renders into `calEl`; calls onChange(start,end) whenever a full
   range is picked. Reused by the homepage hero search and the
   listing-detail booking widget.                                 */
function createDateRangePicker(calEl,onChange){
  let calMonth=new Date().getMonth(), calYear=new Date().getFullYear();
  let rangeStart=null, rangeEnd=null;
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function render(){
    const first=new Date(calYear,calMonth,1);
    const startDow=first.getDay();
    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    let html=`<div class="cal-head"><div class="cal-nav" data-dir="-1">${icon('chevronLeft',{size:14})}</div><div>${MONTHS[calMonth]} ${calYear}</div><div class="cal-nav" data-dir="1">${icon('chevronRight',{size:14})}</div></div><div class="cal-grid">`;
    ['S','M','T','W','T','F','S'].forEach(d=>html+=`<div class="dow">${d}</div>`);
    for(let i=0;i<startDow;i++) html+=`<div></div>`;
    const today=new Date();
    for(let d=1;d<=daysInMonth;d++){
      const thisDate=new Date(calYear,calMonth,d);
      const isPast = thisDate < new Date(today.getFullYear(),today.getMonth(),today.getDate());
      let cls='cal-day'+(isPast?' muted':'');
      if(rangeStart && +thisDate===+rangeStart) cls+=' range-start';
      if(rangeEnd && +thisDate===+rangeEnd) cls+=' range-end';
      if(rangeStart && rangeEnd && thisDate>rangeStart && thisDate<rangeEnd) cls+=' in-range';
      html+=`<div class="${cls}" data-y="${calYear}" data-m="${calMonth}" data-d="${d}">${d}</div>`;
    }
    html+='</div>';
    calEl.innerHTML=html;
    calEl.querySelectorAll('.cal-nav').forEach(b=>b.addEventListener('click',()=>{shiftMonth(+b.dataset.dir);}));
    calEl.querySelectorAll('.cal-day:not(.muted)').forEach(b=>b.addEventListener('click',()=>{
      pickDate(+b.dataset.y,+b.dataset.m,+b.dataset.d);
    }));
  }
  function shiftMonth(dir){calMonth+=dir; if(calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;} render();}
  function pickDate(y,m,d){
    const picked=new Date(y,m,d);
    if(!rangeStart || (rangeStart&&rangeEnd)){rangeStart=picked;rangeEnd=null;}
    else if(picked<rangeStart){rangeEnd=rangeStart;rangeStart=picked;}
    else{rangeEnd=picked;}
    render();
    if(rangeStart&&rangeEnd && onChange) onChange(rangeStart,rangeEnd);
  }
  function clear(){rangeStart=null;rangeEnd=null;render();if(onChange)onChange(null,null);}
  render();
  return {render,clear,get range(){return [rangeStart,rangeEnd];}};
}
