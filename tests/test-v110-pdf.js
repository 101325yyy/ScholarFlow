const assert=require('node:assert/strict');
const pdf=require('../pdf-intelligence.js');
(async()=>{
 const checks=[];const test=(s,fn)=>{fn();checks.push(s)};
 test('DOI extracts from front page',()=>assert.equal(pdf.doiFromText('DOI: 10.1016/j.compositesb.2024.110123.'),'10.1016/j.compositesb.2024.110123'));
 test('DOI URL extracts',()=>assert.equal(pdf.doiFromText('https://doi.org/10.1038/s41586-020-2649-2'),'10.1038/s41586-020-2649-2'));
 test('paper title normalization',()=>assert.equal(pdf.similarity('A-Model for Composite Ablation','A Model for Composite Ablation'),1));
 const items=[{str:'Journal of Applied Mechanics',transform:[10,0,0,10,20,800]}, {str:'A study of',transform:[19,0,0,19,20,700]},{str:'thermomechanical damage in composites',transform:[19,0,0,19,20,677]},{str:'Wang and Smith',transform:[10,0,0,10,20,620]}];
 const lines=pdf.arrangeLines(items);
 test('layout extraction keeps line ordering',()=>assert.equal(lines.length,4));
 test('title uses size & line continuation',()=>assert.match(pdf.titleFromLines(lines),/thermomechanical damage/));
 const source=Buffer.from('/Title (Thermomechanical models for ablation) /Subject (Journal: Journal of Applied Mechanics) /DOI (10.1016/j.corsci.2024.110123)','latin1');
 test('embedded title and DOI from PDF bytes',()=>{const e=pdf.embedded(new Uint8Array(source));assert.equal(e.title,'Thermomechanical models for ablation');assert.equal(e.doi,'10.1016/j.corsci.2024.110123')});
 test('metadata derives journal from first page',()=>{const m=pdf.paperMetadata(new Uint8Array(source),[[{text:'Journal: Journal of Applied Mechanics',size:11,y:800},{text:'Thermomechanical models for ablation',size:19,y:700}]]);assert.equal(m.journal,'Journal of Applied Mechanics');assert.equal(m.doi,'10.1016/j.corsci.2024.110123')});
 const mockFetch=async (url)=>({ok:true,json:async()=>({message:{DOI:'10.1000/abc',title:['Advanced Model for Composite Materials'], 'container-title':['Composite Science'],published:{'date-parts':[[2026]]},author:[{given:'Xin',family:'Li'}]}})});
 const enriched=await pdf.onlineLookup({doi:'10.1000/abc',title:'Advanced Model for Composite Materials'},mockFetch);
 test('DOI-based Crossref enrichment',()=>{assert.equal(enriched.journal,'Composite Science');assert.equal(enriched.year,2026);assert.match(enriched.authors,/Xin Li/)});
 const badFetch=async()=>{throw Error('network down')};
 const no=await pdf.onlineLookup({doi:'10.1000/broken',title:'',journal:''},badFetch);
 test('network failure preserves null result',()=>assert.equal(no,null));
 const fakeFile={name:'Article.pdf',arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.4').buffer};
 const fakePdf={numPages:1,getMetadata:async()=>({info:{}}),getPage:async()=>({getTextContent:async()=>({items:[
   {str:'Journal: Journal of Materials Science',transform:[10,0,0,10,20,770]},
   {str:'Numerical Investigation of Composite Material Ablation',transform:[22,0,0,22,20,710]},
   {str:'DOI: 10.1016/j.matdes.2025.111234',transform:[10,0,0,10,20,640]}
 ]})}),destroy:async()=>{}};
 const reading=await pdf.extract(fakeFile,{getDocument:()=>({promise:Promise.resolve(fakePdf)})});
 test('PDF.js page text maps to title, journal and DOI',()=>{
  assert.match(reading.title,/Numerical Investigation/);
  assert.equal(reading.journal,'Journal of Materials Science');
  assert.equal(reading.doi,'10.1016/j.matdes.2025.111234');
 });
 let ocrCalls=0;
 const oldDocument=global.document;
 global.document={createElement:()=>({width:0,height:0,getContext:()=>({})})};
 try{
  const scannedPdf={numPages:1,getMetadata:async()=>({info:{}}),getPage:async()=>({
   getTextContent:async()=>({items:[]}),getViewport:()=>({width:200,height:400}),render:()=>({promise:Promise.resolve()})
  }),destroy:async()=>{}};
  const scanned=await pdf.extract(fakeFile,{getDocument:()=>({promise:Promise.resolve(scannedPdf)})},{ocr:async()=>{ocrCalls++;return 'Thermomechanical Characterization of Composite Ablative Materials\nAbstract\nThis study examines...'}});
  test('Scanned page falls back to OCR',()=>{assert.equal(ocrCalls,1);assert.match(scanned.title,/Thermomechanical Characterization/)})
 }finally{global.document=oldDocument}
 console.log(checks.map(c=>'PASS '+c).join('\n'));console.log('PASSED',checks.length)
})().catch(err=>{console.error(err);process.exit(1)})
