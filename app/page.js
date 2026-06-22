"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { TURFS } from "../lib/constants";
import { formatHour, getTodayDate, isWeekend } from "../lib/utils";
import OwnerGuard from "../components/OwnerGuard";
function computePrice({ rules, turfId, bookingDate, startHour, duration }) { const dayType = isWeekend(bookingDate) ? "weekend" : "weekday"; let total = 0; for (let hour = startHour; hour < startHour + duration; hour++) { const rule = rules.find(r => r.turf_id === turfId && (r.day_type === "all" || r.day_type === dayType) && r.start_hour <= hour && hour < r.end_hour); if (!rule) throw new Error("No pricing rule found for selected slot."); total += Number(rule.price_per_hour);} return total;}
export default function HomePage(){ return <OwnerGuard><BookingPage/></OwnerGuard> }
function BookingPage() {
 const [user,setUser]=useState(null), [pricingRules,setPricingRules]=useState([]), [availability,setAvailability]=useState([]), [message,setMessage]=useState(null);
 const [form,setForm]=useState({turfId:TURFS[0].id,bookingDate:getTodayDate(),durationHours:1,startHour:18,bookingPrice:"",customerName:"",customerPhone:"",customerEmail:"",notes:""});
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(data.user||null)); loadAll(); const ch=supabase.channel("live-bookings").on("postgres_changes",{event:"*",schema:"public",table:"bookings"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"booking_slots"},loadAll).subscribe(); return ()=>supabase.removeChannel(ch);},[]);
 async function loadAll(){ const [{data:rules},{data:slots}] = await Promise.all([supabase.from("pricing_rules").select("*").eq("is_active",true).order("turf_id"),supabase.from("booking_slots").select("*").eq("booking_date",form.bookingDate)]); setPricingRules(rules||[]); setAvailability(slots||[]); }
 useEffect(()=>{loadAll();},[form.bookingDate]);
 const availableStarts=useMemo(()=>{ const taken=availability.filter(s=>s.turf_id===form.turfId&&s.booking_date===form.bookingDate).map(s=>s.slot_hour); const options=[]; for(let start=0;start<24;start++){const end=start+Number(form.durationHours); if(end>24) continue; const needed=Array.from({length:Number(form.durationHours)},(_,i)=>start+i); if(!needed.some(h=>taken.includes(h))) options.push(start);} return options;},[availability,form.turfId,form.bookingDate,form.durationHours]);
 useEffect(()=>{ if(!availableStarts.includes(Number(form.startHour))) setForm(prev=>({...prev,startHour:availableStarts[0]??0})); },[availableStarts]);
 useEffect(()=>{ try{ const autoPrice=computePrice({rules:pricingRules,turfId:form.turfId,bookingDate:form.bookingDate,startHour:Number(form.startHour),duration:Number(form.durationHours)}); if(form.bookingPrice===""||form.bookingPrice===null) setForm(prev=>({...prev,bookingPrice:autoPrice})); }catch{} },[pricingRules,form.turfId,form.bookingDate,form.startHour,form.durationHours]);
 async function createBooking(){ setMessage(null); if(!form.customerName||!form.customerPhone||!form.bookingPrice){setMessage({type:"error",text:"Price, customer name and customer phone are mandatory."}); return;} if(!availableStarts.includes(Number(form.startHour))){setMessage({type:"error",text:"Selected slot is no longer available."}); return;}
 const slotHours=Array.from({length:Number(form.durationHours)},(_,i)=>Number(form.startHour)+i);
 const payload={turf_id:form.turfId,turf_name:TURFS.find(t=>t.id===form.turfId)?.name,booking_date:form.bookingDate,start_hour:Number(form.startHour),end_hour:Number(form.startHour)+Number(form.durationHours),duration_hours:Number(form.durationHours),booking_price:Number(form.bookingPrice),customer_name:form.customerName,customer_phone:form.customerPhone,customer_email:form.customerEmail||null,notes:form.notes||null,booked_by_email:user?.email||null,booking_status:"confirmed"};
 const {error}=await supabase.rpc("create_booking_with_slots",{booking_payload:payload,slot_hours:slotHours});
 if(error){ setMessage({type:"error",text:error.message.includes("slot_conflict")?"Overlap detected. Another owner has already booked one of these slots.":error.message}); return; }
 setMessage({type:"success",text:`Booking confirmed for ${payload.turf_name}, ${payload.booking_date}, ${formatHour(payload.start_hour)}–${formatHour(payload.end_hour)}, ₹${payload.booking_price}`});
 setForm(prev=>({...prev,bookingPrice:"",customerName:"",customerPhone:"",customerEmail:"",notes:""})); await loadAll(); }
 return <div className="container"><div className="hero"><div><h1>🏏 Palm Turf Booking</h1><p>Live booking app for Kunal & Suyash — no overlap, shared in real time.</p></div><div className="actions"><a className="btn secondary" href="/admin">Admin Dashboard</a><button className="btn danger" onClick={async()=>{await supabase.auth.signOut(); location.href="/login";}}>Logout</button></div></div>
 <div className="card"><h2>Create Booking</h2><div className="grid three">
 <div><label>Turf</label><select value={form.turfId} onChange={e=>setForm({...form,turfId:e.target.value})}>{TURFS.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
 <div><label>Date</label><input type="date" value={form.bookingDate} min={getTodayDate()} onChange={e=>setForm({...form,bookingDate:e.target.value})}/></div>
 <div><label>Duration</label><select value={form.durationHours} onChange={e=>setForm({...form,durationHours:Number(e.target.value),bookingPrice:""})}><option value={1}>1 hour</option><option value={2}>2 hours</option><option value={3}>3 hours</option></select></div>
 <div><label>Available Start Time</label><select value={form.startHour} onChange={e=>setForm({...form,startHour:Number(e.target.value),bookingPrice:""})}>{availableStarts.length?availableStarts.map(h=><option key={h} value={h}>{formatHour(h)} - {formatHour(h+Number(form.durationHours))}</option>):<option>No slots available</option>}</select></div>
 <div><label>Booking Price *</label><input type="number" value={form.bookingPrice} onChange={e=>setForm({...form,bookingPrice:e.target.value})}/></div>
 <div><label>Booked by</label><input value={user?.email||""} readOnly /></div>
 <div><label>Customer Name *</label><input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></div>
 <div><label>Customer Phone *</label><input value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/></div>
 <div><label>Customer Email</label><input value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})}/></div>
 <div className="full"><label>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div></div>
 <div className="actions"><button className="btn" onClick={createBooking}>Confirm Booking</button></div>{message&&<div className={message.type}>{message.text}</div>}</div>
 <div className="card"><h2>Live booked slots for selected date</h2>{TURFS.map(turf=>{const slots=availability.filter(s=>s.turf_id===turf.id&&s.booking_date===form.bookingDate).sort((a,b)=>a.slot_hour-b.slot_hour); return <div key={turf.id} style={{marginBottom:16}}><strong>{turf.name}</strong><div>{slots.length?slots.map(s=><span className="slot-chip" key={turf.id+s.slot_hour}>{formatHour(s.slot_hour)} - {formatHour(s.slot_hour+1)}</span>):<p>No bookings yet.</p>}</div></div>})}</div></div>
}
