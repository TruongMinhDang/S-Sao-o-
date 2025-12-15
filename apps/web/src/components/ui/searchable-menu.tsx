'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export function SearchableMenu({ items, placeholder, value, onChange }:{ 
  items: { value: string; label: string; sub?: string }[];
  placeholder: string;
  value?: string;
  onChange: (v: string)=>void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const kw = q.toLowerCase();
    return items.filter(i => 
      i.label.toLowerCase().includes(kw) || (i.sub?.toLowerCase().includes(kw) ?? false)
    );
  }, [items, q]);

  const currentLabel = useMemo(
    () => items.find(i => i.value===value)?.label || '',
    [items, value]
  );

  useEffect(()=>{
    if(open && inputRef.current) inputRef.current.focus();
  },[open])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" className="w-full border rounded px-3 py-2 text-left bg-white text-base h-[42px] flex items-center"
        onClick={()=> setOpen(o=>!o)}
      >
        <span className="truncate block">{currentLabel || placeholder}</span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-auto">
          <div className="sticky top-0 bg-white p-2 border-b">
            <input
              ref={inputRef}
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Tìm kiếm nhanh..."
              className="w-full border rounded px-3 py-2 text-base"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-3 text-gray-500">Không có kết quả</div>
          ) : filtered.map(i=>(
            <div 
              key={i.value}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onClick={()=> { onChange(i.value); setOpen(false); setQ(''); }}
            >
              <div className="font-medium text-base">{i.label}</div>
              {i.sub && <div className="text-sm text-gray-500">{i.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
