import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [text, setText] = useState('Sphinx');
  const [charData, setCharData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const textRef = useRef(null);
  
  const pink = '#dc3a6e';
  const gray = '#9ca3af';
  
  const fontSize = Math.min(100, Math.max(42, 480 / Math.max(text.length, 1)));
  const baselineY = 185;
  const capHeight = baselineY - fontSize * 0.68;
  const xHeight = baselineY - fontSize * 0.44;
  const descenderLine = baselineY + fontSize * 0.28;
  const startX = 120;
  
  const topLabelY = capHeight - 50;
  const bottomLabelY = descenderLine + 50;

  useEffect(() => {
    if (!textRef.current || text.length === 0) {
      setCharData([]);
      setMetrics(null);
      return;
    }
    
    requestAnimationFrame(() => {
      const textEl = textRef.current;
      const bbox = textEl.getBBox();
      
      setMetrics({ width: bbox.width, right: bbox.x + bbox.width });
      
      const chars = [];
      for (let i = 0; i < textEl.getNumberOfChars(); i++) {
        const extent = textEl.getExtentOfChar(i);
        const char = text[i];
        const lower = char.toLowerCase();
        const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
        
        chars.push({
          char, i, isUpper,
          x: extent.x,
          width: extent.width,
          cx: extent.x + extent.width / 2,
          right: extent.x + extent.width,
          hasDescender: 'gjpqy'.includes(lower),
          hasAscender: 'bdfhklt'.includes(lower),
          hasBowl: 'bdgopqDOPQR'.includes(char),
          hasTittle: 'ij'.includes(lower),
          hasShoulder: 'hmnrHMNR'.includes(char),
          hasSpine: 'sS'.includes(char),
          hasApex: 'AvVwWMxX'.includes(char),
          hasVertex: 'vVwWxXyY'.includes(char),
          hasLeg: 'KRk'.includes(char),
        });
      }
      setCharData(chars);
    });
  }, [text, fontSize]);

  const getAnnotations = () => {
    if (charData.length === 0 || !metrics) return [];
    
    const annotations = [];
    const usedChars = new Set();
    const topLabelXs = [];
    const bottomLabelXs = [];
    
    const labelMinDist = 70;
    
    const isTopLabelTooClose = (x) => topLabelXs.some(lx => Math.abs(lx - x) < labelMinDist);
    const isBottomLabelTooClose = (x) => bottomLabelXs.some(lx => Math.abs(lx - x) < labelMinDist);
    
    const findUnused = (prop, startIdx = 0) => {
      return charData.slice(startIdx).find(c => c[prop] && !usedChars.has(c.i));
    };
    
    const findUnusedWithSpace = (prop, isTop, startIdx = 0) => {
      return charData.slice(startIdx).find(c => {
        if (!c[prop] || usedChars.has(c.i)) return false;
        const labelX = c.cx;
        if (isTop) return !isTopLabelTooClose(labelX);
        return !isBottomLabelTooClose(labelX);
      });
    };
    
    const first = charData[0];
    const maxAnnotations = 5;
    
    const addTop = (x, dotY, label, charIdx) => {
      if (annotations.length >= maxAnnotations) return false;
      if (isTopLabelTooClose(x)) return false;
      annotations.push({ x, dotY, label, side: 'top' });
      topLabelXs.push(x);
      if (charIdx !== undefined) usedChars.add(charIdx);
      return true;
    };
    
    const addBottom = (x, dotY, label, charIdx) => {
      if (annotations.length >= maxAnnotations) return false;
      if (isBottomLabelTooClose(x)) return false;
      annotations.push({ x, dotY, label, side: 'bottom' });
      bottomLabelXs.push(x);
      if (charIdx !== undefined) usedChars.add(charIdx);
      return true;
    };
    
    // Stem
    const stemX = first.x + (first.isUpper ? first.width * 0.18 : first.width * 0.22);
    addTop(stemX, first.isUpper ? capHeight : xHeight, 'Stem', first.i);
    
    // Serif
    addBottom(stemX, baselineY, 'Serif');
    
    // Ascender
    const asc = findUnused('hasAscender', 1);
    if (asc) addTop(asc.x + asc.width * 0.3, capHeight, 'Ascender', asc.i);
    
    // Descender
    const desc = findUnused('hasDescender');
    if (desc) addBottom(desc.cx, descenderLine, 'Descender', desc.i);
    
    // Shoulder
    const shoulder = findUnusedWithSpace('hasShoulder', true, 1);
    if (shoulder) addTop(shoulder.x + shoulder.width * 0.65, xHeight, 'Shoulder', shoulder.i);
    
    // Bowl
    const bowl = findUnusedWithSpace('hasBowl', false, 1);
    if (bowl) addBottom(bowl.cx, baselineY, 'Bowl', bowl.i);
    
    // Spine
    const spine = findUnusedWithSpace('hasSpine', true);
    if (spine) addTop(spine.cx, spine.isUpper ? capHeight : xHeight, 'Spine', spine.i);
    
    // Apex
    const apex = findUnused('hasApex', 1);
    if (apex) addTop(apex.cx, apex.isUpper ? capHeight : xHeight, 'Apex', apex.i);
    
    // Vertex
    const vertex = findUnused('hasVertex', 1);
    if (vertex) addBottom(vertex.cx, baselineY, 'Vertex', vertex.i);
    
    // Tittle
    const tittle = findUnused('hasTittle', 1);
    if (tittle) addTop(tittle.cx, xHeight - fontSize * 0.2, 'Tittle', tittle.i);
    
    // Leg
    const leg = findUnused('hasLeg', 1);
    if (leg) addBottom(leg.x + leg.width * 0.7, baselineY, 'Leg', leg.i);
    
    // x-Height bracket
    annotations.push({ 
      x: metrics.right + 30, 
      y: xHeight, 
      y2: baselineY,
      label: 'x-Height', 
      side: 'bracket'
    });
    
    return annotations;
  };

  const annotations = getAnnotations();
  const viewBoxWidth = metrics ? Math.max(600, metrics.right + 130) : 600;
  const lineEndX = metrics ? metrics.right + 70 : 560;

  return (
    <div className="min-h-screen bg-stone-100 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex justify-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a word..."
            className="w-72 px-5 py-3 bg-white border-0 rounded-full text-xl text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <svg viewBox={`0 0 ${viewBoxWidth} 300`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {text.length > 0 && (
              <>
                <line x1="95" y1={capHeight} x2={lineEndX} y2={capHeight} stroke={gray} strokeWidth="1" strokeDasharray="4,4" opacity="0.4"/>
                <line x1="95" y1={xHeight} x2={lineEndX} y2={xHeight} stroke={gray} strokeWidth="1" strokeDasharray="4,4" opacity="0.4"/>
                <line x1="95" y1={baselineY} x2={lineEndX} y2={baselineY} stroke={gray} strokeWidth="1" opacity="0.5"/>
                <line x1="95" y1={descenderLine} x2={lineEndX} y2={descenderLine} stroke={gray} strokeWidth="1" strokeDasharray="4,4" opacity="0.4"/>
                
                <text x="90" y={capHeight + 4} textAnchor="end" fill={gray} fontSize="10" fontFamily="system-ui">Cap Height</text>
                <text x="90" y={xHeight + 4} textAnchor="end" fill={gray} fontSize="10" fontFamily="system-ui">x-Height</text>
                <text x="90" y={baselineY + 4} textAnchor="end" fill={gray} fontSize="10" fontFamily="system-ui">Baseline</text>
              </>
            )}
            
            <text
              ref={textRef}
              x={startX}
              y={baselineY}
              fontSize={fontSize}
              fontFamily="Georgia, serif"
              fill="#1e293b"
            >
              {text}
            </text>
            
            {annotations.map((ann, idx) => (
              <g key={idx}>
                {ann.side === 'top' && (
                  <>
                    <circle cx={ann.x} cy={ann.dotY} r="4" fill={pink}/>
                    <line x1={ann.x} y1={ann.dotY - 6} x2={ann.x} y2={topLabelY + 12} stroke={pink} strokeWidth="1"/>
                    <text x={ann.x} y={topLabelY} textAnchor="middle" fill={pink} fontSize="12" fontFamily="system-ui" fontWeight="500">{ann.label}</text>
                  </>
                )}
                
                {ann.side === 'bottom' && (
                  <>
                    <circle cx={ann.x} cy={ann.dotY} r="4" fill={pink}/>
                    <line x1={ann.x} y1={ann.dotY + 6} x2={ann.x} y2={bottomLabelY - 12} stroke={pink} strokeWidth="1"/>
                    <text x={ann.x} y={bottomLabelY} textAnchor="middle" fill={pink} fontSize="12" fontFamily="system-ui" fontWeight="500">{ann.label}</text>
                  </>
                )}
                
                {ann.side === 'bracket' && (
                  <>
                    <line x1={ann.x} y1={ann.y} x2={ann.x} y2={ann.y2} stroke={pink} strokeWidth="1.5"/>
                    <line x1={ann.x - 5} y1={ann.y} x2={ann.x + 5} y2={ann.y} stroke={pink} strokeWidth="1.5"/>
                    <line x1={ann.x - 5} y1={ann.y2} x2={ann.x + 5} y2={ann.y2} stroke={pink} strokeWidth="1.5"/>
                    <text x={ann.x + 12} y={(ann.y + ann.y2) / 2 + 4} textAnchor="start" fill={pink} fontSize="12" fontFamily="system-ui" fontWeight="500">{ann.label}</text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
        
        <div className="mt-6 flex justify-center gap-2 flex-wrap">
          {['Sphinx', 'Quickly', 'CAKE', 'Jogger', 'Raven'].map(word => (
            <button
              key={word}
              onClick={() => setText(word)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                text === word 
                  ? 'bg-pink-500 text-white shadow-md' 
                  : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-pink-600 shadow-sm'
              }`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
