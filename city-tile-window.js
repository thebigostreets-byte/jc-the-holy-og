// Exact N-by-N section window, shifted inward at city borders.
// Near-detail meshes stay bounded independently from the 10x10 overview window.
export function selectCityTileWindow(sections, center, size=10) {
  if(!Number.isInteger(size)||size<1) throw new RangeError('Window size must be a positive integer');
  if(!center||!Number.isFinite(center.column)||!Number.isFinite(center.row)) throw new TypeError('A valid center section is required');
  if(!Array.isArray(sections)) throw new TypeError('Sections must be an array');
  if(!sections.length)return [];
  const column=Math.round(center.column),row=Math.round(center.row);
  const cols=sections.map(s=>s.column),rows=sections.map(s=>s.row);
  const minCol=Math.min(...cols),maxCol=Math.max(...cols),minRow=Math.min(...rows),maxRow=Math.max(...rows);
  const width=Math.min(size,maxCol-minCol+1),height=Math.min(size,maxRow-minRow+1);
  const startCol=Math.min(maxCol-width+1,Math.max(minCol,column-Math.floor((width-1)/2)));
  const startRow=Math.min(maxRow-height+1,Math.max(minRow,row-Math.floor((height-1)/2)));
  return sections.filter(s=>s.column>=startCol&&s.column<startCol+width&&s.row>=startRow&&s.row<startRow+height)
    .sort((a,b)=>Math.abs(a.column-column)+Math.abs(a.row-row)-Math.abs(b.column-column)-Math.abs(b.row-row)||a.column-b.column||a.row-b.row);
}

export function selectDetailedTiles(windowSections,center,{legacySpec=false,lowSpec=false}={}) {
  const radius=legacySpec?0:lowSpec?1:2;
  return windowSections.filter(s=>Math.abs(s.column-center.column)<=radius&&Math.abs(s.row-center.row)<=radius);
}
