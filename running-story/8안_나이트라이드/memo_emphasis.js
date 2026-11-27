/* Running memo emphasis: split the user's memo into lines and tokens, and mark the parts worth emphasising.
   The words are never changed, the user's own line breaks are kept, and no punctuation is added.

   MemoEmphasis.parse(review, marked?)
     review : the memo as the user wrote it ('\n' between lines)
     marked : optional copy of the same memo with [[...]] (auto kind) or [[...|kind]] around the parts to emphasise
              kinds: num (numbers / distance / time), body (body, heart rate, pain), plan (next run, rest, days),
                     feel (feelings), key (anything else important)
              without it, parts are found automatically with the rules below
     -> [{tokens:[{text, kind|null}], headline:boolean}]   (the first line is the headline)

   MemoEmphasis.drawLine(ctx, line, cx, y, o)   draws one line centred at cx
     o = {px, font(px,kind)->css font, color(kind,k)->css colour, decorate(ctx,kind,x,y,w,px,k), k (0..1 light-up progress), base}
   Each template supplies its own font / colour / decorate, so the same marks look native in every design. */
(function(root){
const RULES=[
  ['num', /\d+(?:\.\d+)?\s?(?:km|k|m|분|초|시간|bpm|kcal|회|번|%|층)/g],
  ['body',/(?:심박수?|근육통|다리|무릎|발목|종아리|허벅지|햄스트링|정강이|발바닥|허리|어깨|호흡|숨|땀|통증|피로|부상|쥐|컨디션)/g],
  ['plan',/(?:내일|모레|다음\s?주|주말|[월화수목금토일]요일|오전|오후|아침|저녁|새벽|하루 더 쉬고|쉬고|회복|목표)/g],
  ['feel',/(?:좋[다았은]|행복|상쾌|뿌듯|최고|아쉽|즐거|신나|힘들[다었]?|지쳤|설레|기분)/g]];
function auto(line){const marks=[];RULES.forEach(([kind,re])=>{re.lastIndex=0;let m;while((m=re.exec(line))){marks.push([m.index,m.index+m[0].length,kind])}});
  marks.sort((a,b)=>a[0]-b[0]||(b[1]-b[0])-(a[1]-a[0]));const keep=[];let end=-1;for(const m of marks){if(m[0]>=end){keep.push(m);end=m[1]}}
  const tok=[];let i=0;keep.forEach(([a,b,k])=>{if(a>i)tok.push({text:line.slice(i,a),kind:null});tok.push({text:line.slice(a,b),kind:k});i=b});if(i<line.length)tok.push({text:line.slice(i),kind:null});return tok}
function guess(text){for(const [kind,re] of RULES){re.lastIndex=0;if(re.test(text))return kind}return'key'}
function fromMarks(line){const tok=[];const re=/\[\[([^\]|]+)(?:\|(\w+))?\]\]/g;let i=0,m;while((m=re.exec(line))){if(m.index>i)tok.push({text:line.slice(i,m.index),kind:null});tok.push({text:m[1],kind:m[2]||guess(m[1])});i=m.index+m[0].length}
  if(i<line.length)tok.push({text:line.slice(i),kind:null});return tok}
function parse(review,marked){const plain=review.split('\n').map(s=>s.trim()).filter(Boolean);
  const ml=marked?marked.split('\n').map(s=>s.trim()).filter(Boolean):null;
  return plain.map((ln,i)=>{let tokens=ml&&ml[i]&&ml[i].replace(/\[\[([^\]|]+)(?:\|\w+)?\]\]/g,'$1')===ln?fromMarks(ml[i]):auto(ln);return{tokens,headline:i===0}})}
function measure(ctx,line,o){let w=0;const ws=line.tokens.map(tk=>{ctx.font=o.font(o.px*(line.headline?o.headScale||1:1),tk.kind);const m=ctx.measureText(tk.text).width;w+=m;return m});return{w,ws}}
function drawLine(ctx,line,cx,y,o){const {w,ws}=measure(ctx,line,o);let x=cx-w/2;const px=o.px*(line.headline?o.headScale||1:1);
  line.tokens.forEach((tk,i)=>{ctx.save();ctx.font=o.font(px,tk.kind);ctx.textAlign='left';ctx.textBaseline='alphabetic';
    if(tk.kind&&o.decorate)o.decorate(ctx,tk.kind,x,y,ws[i],px,o.k);
    ctx.fillStyle=o.color(tk.kind,o.k);if(tk.kind&&o.glow){ctx.shadowColor=o.color(tk.kind,1);ctx.shadowBlur=o.glow*o.k}ctx.fillText(tk.text,x,y);ctx.restore();x+=ws[i]});return w}
function width(ctx,line,o){return measure(ctx,line,o).w}
root.MemoEmphasis={parse,drawLine,width,RULES};
})(typeof window!=='undefined'?window:globalThis);
