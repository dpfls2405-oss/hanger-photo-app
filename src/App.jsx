import { useState, useEffect, useCallback } from "react";
import { supabase, STORAGE_URL } from "./supabaseClient";

export default function App() {
  const [seriesList, setSeriesList] = useState([]);
  const [photoMap, setPhotoMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("main");
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    const { data: codes } = await supabase
      .from("recon_codes")
      .select("id, code, part_name, series:series_id(id, series_name)")
      .order("code");

    const { data: photos } = await supabase
      .from("photos")
      .select("recon_code_id, photo_type, image_url, memo, uploaded_at");

    if (!codes) return;

    // 시리즈별 그룹핑
    const grouped = {};
    codes.forEach((rc) => {
      const sName = rc.series.series_name;
      if (!grouped[sName]) grouped[sName] = { series: sName, codes: [] };
      grouped[sName].codes.push({ id: rc.id, code: rc.code, name: rc.part_name });
    });

    // 사진 맵
    const pMap = {};
    (photos || []).forEach((p) => {
      pMap[`${p.recon_code_id}__${p.photo_type}`] = {
        url: p.image_url,
        memo: p.memo,
        date: new Date(p.uploaded_at).toLocaleDateString("ko", { month: "2-digit", day: "2-digit" }),
      };
    });

    setSeriesList(Object.values(grouped));
    setPhotoMap(pMap);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getPhotoKeys = (s) => {
    const keys = [];
    s.codes.forEach((c) => {
      keys.push({ key: `${c.id}__hook`, rcId: c.id, code: c.code, codeName: c.name, type: "hook", label: "도장 고리", desc: "고리/지그 형상", icon: "🪝" });
      keys.push({ key: `${c.id}__hanger`, rcId: c.id, code: c.code, codeName: c.name, type: "hanger", label: "도장 행거", desc: "제품 걸린 상태", icon: "📐" });
    });
    return keys;
  };

  const getStatus = (s) => {
    const keys = getPhotoKeys(s);
    const done = keys.filter((k) => photoMap[k.key]).length;
    return { done, total: keys.length, complete: done === keys.length, partial: done > 0 && done < keys.length };
  };

  // 업로드
  const handleUpload = async (file) => {
    if (!file || !uploadTarget) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${uploadTarget.code}/${uploadTarget.type}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("hanger-photos")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const imageUrl = `${STORAGE_URL}/${path}`;

      // upsert photo record
      const { error: dbErr } = await supabase
        .from("photos")
        .upsert(
          { recon_code_id: uploadTarget.rcId, photo_type: uploadTarget.type, image_url: imageUrl, memo },
          { onConflict: "recon_code_id,photo_type" }
        );

      if (dbErr) throw dbErr;

      await loadData();
      setUploadTarget(null);
      setMemo("");
    } catch (err) {
      alert("업로드 실패: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const total = seriesList.length;
  const complete = seriesList.filter((s) => getStatus(s).complete).length;
  const partial = seriesList.filter((s) => getStatus(s).partial).length;
  const none = total - complete - partial;

  const filtered = seriesList.filter((s) =>
    s.series.toLowerCase().includes(search.toLowerCase()) ||
    s.codes.some((c) => c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🪝</div>
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  // ===== 촬영 =====
  if (uploadTarget) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => { setUploadTarget(null); setMemo(""); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg">←</button>
            <div className="min-w-0">
              <div className="font-bold text-gray-900">{uploadTarget.icon} {uploadTarget.label} 촬영</div>
              <div className="text-xs text-gray-400 truncate">{uploadTarget.codeName}</div>
              <div className="font-mono text-xs text-gray-300 truncate">{uploadTarget.code}</div>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <div className="rounded-2xl p-3 text-sm font-medium bg-orange-50 text-orange-700">
            📌 <strong>{uploadTarget.codeName}</strong>의 {uploadTarget.desc}을 촬영해주세요
          </div>

          <label className="block bg-gray-900 rounded-2xl h-60 flex items-center justify-center cursor-pointer active:bg-gray-700 transition">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUpload(e.target.files[0]);
              }}
              disabled={uploading}
            />
            <div className="text-center text-white">
              {uploading ? (
                <>
                  <div className="text-4xl mb-3 animate-pulse">⏳</div>
                  <div className="text-lg font-medium">업로드 중...</div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-3">📸</div>
                  <div className="text-lg font-medium">탭하여 촬영</div>
                </>
              )}
            </div>
          </label>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="text-sm font-medium text-gray-600 block mb-1.5">메모 (선택)</label>
            <input type="text" placeholder="예: 고리 3개, 상하 배치..." value={memo} onChange={(e) => setMemo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base" />
          </div>
        </div>
      </div>
    );
  }

  // ===== 상세 =====
  if (selectedSeries !== null && view === "detail") {
    const s = seriesList[selectedSeries];
    const keys = getPhotoKeys(s);
    const st = getStatus(s);

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => { setSelectedSeries(null); setView("main"); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg">←</button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{s.series}</span>
                <span className="text-xs text-gray-400">{st.done}/{st.total} 완료</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">재공코드 {s.codes.length}개</div>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {s.codes.map((c) => {
            const codeKeys = keys.filter((k) => k.code === c.code);
            return (
              <div key={c.code} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-700">{c.name}</div>
                  <div className="font-mono text-xs text-gray-400">{c.code}</div>
                </div>
                {codeKeys.map((pk) => {
                  const photo = photoMap[pk.key];
                  return (
                    <div key={pk.key} className="border-b border-gray-100 last:border-0">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{pk.icon}</span>
                          <div>
                            <div className="text-sm text-gray-700">{pk.label}</div>
                            <div className="text-xs text-gray-400">{pk.desc}</div>
                          </div>
                        </div>
                        {photo ? (
                          <div className="flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">완료</span>
                            <button onClick={() => setUploadTarget(pk)} className="text-xs text-orange-500 font-medium">재촬영</button>
                          </div>
                        ) : (
                          <button onClick={() => setUploadTarget(pk)}
                            className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl active:bg-orange-600 transition">촬영</button>
                        )}
                      </div>
                      {photo && (
                        <div className="px-4 pb-3">
                          <img src={photo.url} alt={pk.label} className="w-full h-40 object-cover rounded-xl bg-gray-100" />
                          {photo.memo && <div className="text-xs text-gray-400 mt-1.5">💬 {photo.memo}</div>}
                          <div className="text-xs text-gray-300 mt-0.5">{photo.date}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== 메인 =====
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="font-bold text-lg text-gray-900">도장 행거 사진 관리</div>
          <div className="text-xs text-gray-400 mb-3">시리즈별 · 재공코드별 고리/행거 사진 등록</div>
          <input type="text" placeholder="🔍 시리즈 또는 재공코드 검색..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base bg-gray-50 focus:bg-white focus:border-orange-300 focus:outline-none transition" />
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-800">등록 현황</span>
            <span className="text-sm font-medium text-green-600">{complete}/{total} 시리즈 완료</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden flex">
            <div className="bg-green-500 h-3 transition-all" style={{ width: `${(complete / total) * 100}%` }} />
            <div className="bg-orange-400 h-3 transition-all" style={{ width: `${(partial / total) * 100}%` }} />
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />완료 {complete}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" />진행중 {partial}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200" />미등록 {none}</span>
          </div>
        </div>
        <div className="space-y-2">
          {filtered.map((s, idx) => {
            const st = getStatus(s);
            const keys = getPhotoKeys(s);
            const missing = keys.filter((k) => !photoMap[k.key]);
            const missingByCode = {};
            missing.forEach((m) => { if (!missingByCode[m.code]) missingByCode[m.code] = []; missingByCode[m.code].push(m); });

            return (
              <div key={s.series} onClick={() => { setSelectedSeries(idx); setView("detail"); }}
                className={`rounded-2xl border p-3 cursor-pointer active:scale-[0.98] transition ${
                  st.complete ? "border-green-200 bg-green-50/40" : st.partial ? "border-orange-200 bg-orange-50/30" : "border-gray-200 bg-white"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5 ${
                    st.complete ? "bg-green-100" : st.partial ? "bg-orange-100" : "bg-gray-100"}`}>
                    {st.complete ? "✅" : st.partial ? "⏳" : "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-800">{s.series}</span>
                      <span className="text-xs text-gray-300">재공 {s.codes.length}개 · {st.done}/{st.total}</span>
                    </div>
                    {missing.length > 0 ? (
                      <div className="space-y-1 mt-1.5">
                        {Object.entries(missingByCode).slice(0, 3).map(([code, items]) => (
                          <div key={code} className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs text-gray-400 shrink-0">{code.length > 16 ? code.slice(-10) : code}</span>
                            {items.map((m) => (
                              <span key={m.key} className="text-xs px-1.5 py-0.5 rounded font-medium bg-orange-100 text-orange-600">
                                {m.icon} {m.label}
                              </span>
                            ))}
                          </div>
                        ))}
                        {Object.keys(missingByCode).length > 3 && (
                          <div className="text-xs text-gray-400">+{Object.keys(missingByCode).length - 3}개 재공코드 더...</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 mt-1">모든 사진 등록 완료</div>
                    )}
                  </div>
                  <span className="text-gray-300 text-lg shrink-0 mt-2">›</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
