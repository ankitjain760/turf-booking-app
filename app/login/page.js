"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { OWNER_EMAILS } from "../../lib/constants";
export default function LoginPage(){
 const [email,setEmail]=useState(OWNER_EMAILS[0]), [password,setPassword]=useState(""), [message,setMessage]=useState(null);
 async function signIn(){ setMessage(null); const {error}=await supabase.auth.signInWithPassword({email,password}); if(error){setMessage({type:"error",text:error.message}); return;} location.href="/"; }
 return <div className="container"><div className="card" style={{maxWidth:520,margin:"40px auto"}}><h1>Owner Login</h1><p>Allowed owners: {OWNER_EMAILS.join(" , ")}</p><div className="grid"><div><label>Email</label><select value={email} onChange={e=>setEmail(e.target.value)}>{OWNER_EMAILS.map(e=><option key={e} value={e}>{e}</option>)}</select></div><div><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div></div><div className="actions"><button className="btn" onClick={signIn}>Login</button></div>{message&&<div className={message.type}>{message.text}</div>}</div></div>
}
