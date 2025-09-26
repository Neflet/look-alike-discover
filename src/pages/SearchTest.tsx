import { useState } from "react";
import { searchByImage, type Filters } from "../lib/searchByImage";

export default function SearchTest(){
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [bbox, setBbox] = useState<{x:number;y:number;w:number;h:number}|undefined>();
  const [filters, setFilters] = useState<Filters|undefined>();

  const run = async () => {
    setLoading(true); setErr(null); setMatches([]);
    try{
      const input = file ?? (url.trim());
      if(!input) throw new Error("Provide a file or URL");
      const out = await searchByImage(input, filters, bbox);
      setMatches(out.matches || []);
    }catch(e:any){ setErr(e.message) }
    finally{ setLoading(false) }
  };

  return (
    <div style={{maxWidth:960, margin:"2rem auto"}}>
      <h1>SwagAI Search Test</h1>
      <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." style={{width:"100%", padding:8}} />
      <div style={{margin:"8px 0"}}>— or —</div>
      <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
      <div style={{marginTop:8}}>
        <button onClick={run} disabled={loading}>{loading? "Searching...":"Search"}</button>
        {err && <span style={{color:"crimson", marginLeft:8}}>{err}</span>}
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:12, marginTop:16}}>
        {matches.map((m)=>(
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" style={{border:"1px solid #eee", borderRadius:8, padding:8, textDecoration:"none", color:"#111"}}>
            <img src={m.main_image_url} style={{width:"100%", height:180, objectFit:"cover", borderRadius:6}}/>
            <div style={{fontWeight:700}}>{m.brand}</div>
            <div style={{fontSize:13}}>{m.title}</div>
            <div style={{fontSize:12, color:"#666"}}>score: {Number(m.score).toFixed(3)}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
