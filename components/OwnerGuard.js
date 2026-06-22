"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
export default function OwnerGuard({ children }) {
  const [state,setState]=useState({loading:true,user:null});
  useEffect(()=>{supabase.auth.getUser().then(({data})=>setState({loading:false,user:data.user||null}));
  const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setState({loading:false,user:s?.user||null}));
  return ()=>listener.subscription.unsubscribe();},[]);
  if(state.loading) return <div className="container"><div className="card">Loading...</div></div>;
  if(!state.user){ if(typeof window!=="undefined") window.location.href="/login"; return null; }
  return children;
}
