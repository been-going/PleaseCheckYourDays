// Asia/Seoul(KST) 기준 yyyy-MM-dd 문자열
export function ymdKST(d = new Date()) {
  // KST는 1년 내내 UTC+9 고정
  const KST_OFFSET = 9 * 60; // 분
  const utc = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
  const kst = new Date(utc + KST_OFFSET * 60 * 1000);
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const day = String(kst.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
