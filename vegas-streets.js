export const VEGAS_REFERENCE = {lon:-115.173,lat:36.108};

export const VEGAS_LOCATIONS = Object.freeze({
  strip:{label:'THE STRIP',lon:-115.173,lat:36.108},
  psalms:{label:'PSALMS · PALMS AREA',lon:-115.196,lat:36.116},
  airport:{label:'HARRY REID AIRPORT',lon:-115.152,lat:36.083},
  sphere:{label:'SPHERE / HIGH ROLLER',lon:-115.163,lat:36.1208},
  downtown:{label:'DOWNTOWN',lon:-115.142,lat:36.168},
  residential:{label:'RESIDENTIAL DISTRICT',lon:-115.196,lat:36.132}
});

const ROUTES = [
  {name:'Las Vegas Blvd',kind:'arterial',width:30,points:[[-115.1742,36.080],[-115.1736,36.093],[-115.1730,36.108],[-115.1725,36.118],[-115.1717,36.130],[-115.1707,36.1436],[-115.1703,36.153]]},
  {name:'I-15',kind:'freeway',width:38,points:[[-115.1774,36.078],[-115.1769,36.093],[-115.1764,36.108],[-115.1759,36.123],[-115.1753,36.145]]},
  {name:'Frank Sinatra Dr',kind:'arterial',width:18,points:[[-115.1782,36.084],[-115.1781,36.102],[-115.1779,36.116],[-115.1774,36.131]]},
  {name:'Dean Martin Dr',kind:'arterial',width:18,points:[[-115.1831,36.084],[-115.1830,36.102],[-115.1828,36.116],[-115.1821,36.132]]},
  {name:'Koval Ln',kind:'arterial',width:16,points:[[-115.1637,36.084],[-115.1635,36.102],[-115.1631,36.116],[-115.1626,36.132]]},
  {name:'Paradise Rd',kind:'arterial',width:22,points:[[-115.1517,36.078],[-115.1516,36.093],[-115.1515,36.108],[-115.1511,36.123],[-115.1505,36.145]]},
  {name:'Tropicana Ave',kind:'arterial',width:26,points:[[-115.205,36.0996],[-115.190,36.0996],[-115.1775,36.0997],[-115.164,36.0998],[-115.145,36.1000]]},
  {name:'Flamingo Rd',kind:'arterial',width:24,points:[[-115.211,36.1145],[-115.197,36.1145],[-115.183,36.1145],[-115.171,36.1145],[-115.158,36.1145],[-115.144,36.1145]]},
  {name:'Harmon Ave',kind:'arterial',width:18,points:[[-115.201,36.1086],[-115.187,36.1086],[-115.173,36.1086],[-115.159,36.1086],[-115.145,36.1086]]},
  {name:'Sands Ave',kind:'arterial',width:20,points:[[-115.192,36.1214],[-115.179,36.1214],[-115.165,36.1214],[-115.146,36.1214]]},
  {name:'Spring Mountain Rd',kind:'arterial',width:22,points:[[-115.208,36.1265],[-115.193,36.1265],[-115.178,36.1265],[-115.162,36.1265],[-115.145,36.1265]]},
  {name:'Desert Inn Rd',kind:'arterial',width:22,points:[[-115.207,36.1295],[-115.191,36.1295],[-115.176,36.1295],[-115.16,36.1295],[-115.145,36.1295]]},
  {name:'Sahara Ave',kind:'arterial',width:24,points:[[-115.21,36.1436],[-115.192,36.1436],[-115.176,36.1436],[-115.159,36.1436],[-115.144,36.1436]]},
  {name:'Russell Rd',kind:'arterial',width:18,points:[[-115.204,36.0825],[-115.187,36.0825],[-115.169,36.0825],[-115.151,36.0825]]},
  {name:'Airport Connector',kind:'arterial',width:20,points:[[-115.1516,36.080],[-115.1542,36.086],[-115.1573,36.092],[-115.1602,36.099],[-115.162,36.104]]},
  {name:'W Twain Ave',kind:'side',width:10,points:[[-115.207,36.1207],[-115.192,36.1207],[-115.178,36.1207],[-115.17,36.1207]]},
  {name:'W Reno Ave',kind:'side',width:10,points:[[-115.207,36.0895],[-115.19,36.0895],[-115.174,36.0895],[-115.16,36.0895]]},
  {name:'S Valley View Blvd',kind:'side',width:12,points:[[-115.195,36.083],[-115.195,36.101],[-115.195,36.119],[-115.195,36.138],[-115.195,36.151]]},
  {name:'S Industrial Rd',kind:'side',width:10,points:[[-115.187,36.083],[-115.187,36.101],[-115.187,36.119],[-115.187,36.138],[-115.187,36.151]]},
  {name:'S Maryland Pkwy',kind:'side',width:12,points:[[-115.135,36.080],[-115.135,36.101],[-115.135,36.122],[-115.135,36.143],[-115.135,36.161]]},
  {name:'W Flamingo Rd',kind:'side',width:10,points:[[-115.221,36.1145],[-115.211,36.1145],[-115.201,36.1145],[-115.191,36.1145]]}
];

const DISTRICTS = [
  {name:'THE STRIP',lon:-115.172,lat:36.116,radius:1800},
  {name:'PALMS DISTRICT',lon:-115.196,lat:36.116,radius:1250},
  {name:'HARRY REID AIRPORT',lon:-115.152,lat:36.083,radius:1500},
  {name:'DOWNTOWN',lon:-115.142,lat:36.168,radius:1400}
];

export function projectVegasPoint(lon,lat,{anchorX=0,anchorZ=0,referenceLon=VEGAS_REFERENCE.lon,referenceLat=VEGAS_REFERENCE.lat}={}) {
  const metresPerLon=111319.49*Math.cos(referenceLat*Math.PI/180);
  const metresPerLat=111132.92;
  return {x:anchorX+(lon-referenceLon)*metresPerLon,z:anchorZ-(lat-referenceLat)*metresPerLat};
}

export function createVegasStreetNetwork(options={}) {
  const project=(lon,lat)=>projectVegasPoint(lon,lat,options);
  const routes=ROUTES.map(route=>({
    ...route,
    geoPoints:route.points.map(point=>point.slice()),
    points:route.points.map(([lon,lat])=>{const p=project(lon,lat);return [p.x,p.z];})
  }));
  const segments=[];
  for(const route of routes)for(let i=0;i<route.points.length-1;i++){
    const a=route.points[i],b=route.points[i+1];
    segments.push({name:route.name,kind:route.kind,width:route.width,route,a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1])});
  }
  const districts=DISTRICTS.map(district=>({...district,...project(district.lon,district.lat)}));
  return {routes,segments,districts,project,reference:{lon:options.referenceLon??VEGAS_REFERENCE.lon,lat:options.referenceLat??VEGAS_REFERENCE.lat}};
}

export function nearestStreet(x,z,network,maxDistance=55) {
  let best=null;
  for(const segment of network?.segments||[]){
    const [ax,az]=segment.a,[bx,bz]=segment.b;
    const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;
    const t=len2?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len2)):0;
    const px=ax+dx*t,pz=az+dz*t,distance=Math.hypot(x-px,z-pz);
    if(!best||distance<best.distance)best={name:segment.name,kind:segment.kind,distance,point:{x:px,z:pz},segment};
  }
  return best&&best.distance<=maxDistance?best:null;
}

export function districtAt(x,z,network) {
  let best=null;
  for(const district of network?.districts||[]){
    const distance=Math.hypot(x-district.x,z-district.z);
    if(!best||distance<best.distance)best={name:district.name,distance,radius:district.radius};
  }
  return best&&best.distance<=best.radius?best.name:'LAS VEGAS';
}

export function resolveStreetLocation(x,z,network) {
  const district=districtAt(x,z,network),road=nearestStreet(x,z,network,58);
  return {street:road?.name||'OFF-ROAD',district,distance:road?Math.round(road.distance):null,label:road?road.name.toUpperCase()+' · '+district:'OFF-ROAD · '+district};
}

// Exact project CRS used by the tile source. Keep fallback streets aligned.
const A=6378137,F=1/298.257223563,E2=F*(2-F),EP2=E2/(1-E2),K=.9996;
export function vegasToUTM11(lon,lat){
 const p=lat*Math.PI/180,l=lon*Math.PI/180,l0=-117*Math.PI/180,s=Math.sin(p),c=Math.cos(p),t=Math.tan(p),n=A/Math.sqrt(1-E2*s*s),T=t*t,C=EP2*c*c,d=c*(l-l0);
 const m=A*((1-E2/4-3*E2**2/64-5*E2**3/256)*p-(3*E2/8+3*E2**2/32+45*E2**3/1024)*Math.sin(2*p)+(15*E2**2/256+45*E2**3/1024)*Math.sin(4*p)-(35*E2**3/3072)*Math.sin(6*p));
 return [500000+K*n*(d+(1-T+C)*d**3/6+(5-18*T+T*T+72*C-58*EP2)*d**5/120),K*(m+n*t*(d*d/2+(5-T+9*C+4*C*C)*d**4/24+(61-58*T+T*T+600*C-330*EP2)*d**6/720))];
}
