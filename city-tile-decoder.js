let decoder;
export function isGlb(bytes){return bytes.length>=12&&bytes[0]===103&&bytes[1]===108&&bytes[2]===84&&bytes[3]===70;}
export async function decodeCityTile(bytes){
 if(isGlb(bytes))return bytes;
 decoder??=import('./vendor/brotli/brotli_dec_wasm.js').then(async module=>{await module.default();return module;});
 let decoded;
 try{decoded=(await decoder).decompress(bytes);}catch(error){throw new Error('City tile decoding failed: '+error.message);}
 if(!isGlb(decoded))throw new Error('City tile response is not valid 3D data.');
 return decoded;
}
