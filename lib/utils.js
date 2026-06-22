export function formatHour(hour){ if(hour===24) return "00:00"; return String(hour).padStart(2,"0")+":00"; }
export function getTodayDate(){ const now=new Date(); const offset=now.getTimezoneOffset(); const local=new Date(now.getTime()-offset*60000); return local.toISOString().split("T")[0]; }
export function isWeekend(dateStr){ const d=new Date(dateStr+"T00:00:00"); const day=d.getDay(); return day===0||day===6; }
