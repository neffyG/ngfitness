// Bible data: 66 books with chapter counts, reading plans, links out to KJV / NIV / RVR1960,
// and a verse-of-the-day list (KJV — public domain, so the text can live in the app).

// [usfm, English name, Spanish name, chapters]
const RAW = [
  ["GEN", "Genesis", "Génesis", 50], ["EXO", "Exodus", "Éxodo", 40], ["LEV", "Leviticus", "Levítico", 27], ["NUM", "Numbers", "Números", 36],
  ["DEU", "Deuteronomy", "Deuteronomio", 34], ["JOS", "Joshua", "Josué", 24], ["JDG", "Judges", "Jueces", 21], ["RUT", "Ruth", "Rut", 4],
  ["1SA", "1 Samuel", "1 Samuel", 31], ["2SA", "2 Samuel", "2 Samuel", 24], ["1KI", "1 Kings", "1 Reyes", 22], ["2KI", "2 Kings", "2 Reyes", 25],
  ["1CH", "1 Chronicles", "1 Crónicas", 29], ["2CH", "2 Chronicles", "2 Crónicas", 36], ["EZR", "Ezra", "Esdras", 10], ["NEH", "Nehemiah", "Nehemías", 13],
  ["EST", "Esther", "Ester", 10], ["JOB", "Job", "Job", 42], ["PSA", "Psalms", "Salmos", 150], ["PRO", "Proverbs", "Proverbios", 31],
  ["ECC", "Ecclesiastes", "Eclesiastés", 12], ["SNG", "Song of Songs", "Cantares", 8], ["ISA", "Isaiah", "Isaías", 66], ["JER", "Jeremiah", "Jeremías", 52],
  ["LAM", "Lamentations", "Lamentaciones", 5], ["EZK", "Ezekiel", "Ezequiel", 48], ["DAN", "Daniel", "Daniel", 12], ["HOS", "Hosea", "Oseas", 14],
  ["JOL", "Joel", "Joel", 3], ["AMO", "Amos", "Amós", 9], ["OBA", "Obadiah", "Abdías", 1], ["JON", "Jonah", "Jonás", 4],
  ["MIC", "Micah", "Miqueas", 7], ["NAM", "Nahum", "Nahúm", 3], ["HAB", "Habakkuk", "Habacuc", 3], ["ZEP", "Zephaniah", "Sofonías", 3],
  ["HAG", "Haggai", "Hageo", 2], ["ZEC", "Zechariah", "Zacarías", 14], ["MAL", "Malachi", "Malaquías", 4],
  ["MAT", "Matthew", "Mateo", 28], ["MRK", "Mark", "Marcos", 16], ["LUK", "Luke", "Lucas", 24], ["JHN", "John", "Juan", 21],
  ["ACT", "Acts", "Hechos", 28], ["ROM", "Romans", "Romanos", 16], ["1CO", "1 Corinthians", "1 Corintios", 16], ["2CO", "2 Corinthians", "2 Corintios", 13],
  ["GAL", "Galatians", "Gálatas", 6], ["EPH", "Ephesians", "Efesios", 6], ["PHP", "Philippians", "Filipenses", 4], ["COL", "Colossians", "Colosenses", 4],
  ["1TH", "1 Thessalonians", "1 Tesalonicenses", 5], ["2TH", "2 Thessalonians", "2 Tesalonicenses", 3], ["1TI", "1 Timothy", "1 Timoteo", 6], ["2TI", "2 Timothy", "2 Timoteo", 4],
  ["TIT", "Titus", "Tito", 3], ["PHM", "Philemon", "Filemón", 1], ["HEB", "Hebrews", "Hebreos", 13], ["JAS", "James", "Santiago", 5],
  ["1PE", "1 Peter", "1 Pedro", 5], ["2PE", "2 Peter", "2 Pedro", 3], ["1JN", "1 John", "1 Juan", 5], ["2JN", "2 John", "2 Juan", 1],
  ["3JN", "3 John", "3 Juan", 1], ["JUD", "Jude", "Judas", 1], ["REV", "Revelation", "Apocalipsis", 22],
];
export const BOOKS = RAW.map(([id, en, es, ch], i) => ({ id, en, es, ch, i, nt: i >= 39 }));
export const BOOK = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
export const TOTAL_CH = BOOKS.reduce((s, b) => s + b.ch, 0); // 1189
export const GOSPELS = ["MAT", "MRK", "LUK", "JHN"];

// Built into the app (public domain, works offline): KJV, BSB, RV1909.
// NIV and RVR1960 are copyrighted, so those open online instead.
export const TRANSLATIONS = {
  KJV: { name: "King James Version", file: "kjv", es: false },
  BSB: { name: "Berean Standard Bible", file: "bsb", es: false },
  RV1909: { name: "Reina-Valera 1909", file: "rv1909", es: true },
  NIV: { name: "New International Version", link: true, es: false, yv: 111 },
  RVR1960: { name: "Reina-Valera 1960", link: true, es: true, yv: 149 },
};
export const BUILT_IN = ["BSB", "KJV", "RV1909"];

// load one book of a built-in translation (chapters → verses); cached in memory, and by the service worker for offline
const cache = new Map();
export function loadBook(tr, id) {
  const key = `${tr}/${id}`;
  if (!cache.has(key)) cache.set(key, fetch(`bible/${TRANSLATIONS[tr].file}/${id}.json`).then((r) => { if (!r.ok) throw new Error("missing"); return r.json(); }).catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key);
}
export async function loadChapter(tr, k) { const [id, c] = k.split("."); const b = await loadBook(tr, id); return b[+c - 1] || []; }

// "Proverbs 3:5-6" → { id: "PRO", c: 3, v1: 5, v2: 6 }
const NAME_TO_ID = (() => { const m = {}; for (const [id, en, es] of RAW) { m[en.toLowerCase()] = id; m[es.toLowerCase()] = id; } m.psalm = "PSA"; m["song of solomon"] = "SNG"; return m; })();
export function parseRef(ref) {
  const m = String(ref).trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?/);
  if (!m) return null;
  const id = NAME_TO_ID[m[1].toLowerCase()]; if (!id) return null;
  return { id, c: +m[2], v1: +m[3], v2: +(m[4] || m[3]) };
}
export async function loadRef(tr, ref) {
  const r = parseRef(ref); if (!r) return null;
  const ch = await loadChapter(tr, `${r.id}.${r.c}`);
  return ch.slice(r.v1 - 1, r.v2).join(" ");
}
export const refLabel = (ref, es) => { const r = parseRef(ref); if (!r || !es) return ref; return ref.replace(/^.+?(?=\s+\d+:)/, BOOK[r.id].es); };

export const PLANS = {
  path: { name: "Start with Jesus", sub: "Gospels → rest of the New Testament → Psalms & Proverbs → Old Testament" },
  canon: { name: "Cover to cover", sub: "Genesis to Revelation, in order" },
  nt: { name: "New Testament first", sub: "Matthew → Revelation, then Genesis → Malachi" },
};
const chaptersOf = (ids) => ids.flatMap((id) => Array.from({ length: BOOK[id].ch }, (_, i) => `${id}.${i + 1}`));
const ALL = BOOKS.map((b) => b.id), NT = ALL.filter((id) => BOOK[id].nt), OT = ALL.filter((id) => !BOOK[id].nt);
const ORDERS = {
  canon: chaptersOf(ALL),
  nt: chaptersOf([...NT, ...OT]),
  path: chaptersOf(["JHN", "MRK", "MAT", "LUK", ...NT.filter((x) => !GOSPELS.includes(x)), "PSA", "PRO", ...OT.filter((x) => x !== "PSA" && x !== "PRO")]),
};
export const planOrder = (p) => ORDERS[p] || ORDERS.path;

export const bookName = (id, es) => (es ? BOOK[id].es : BOOK[id].en);
export const chName = (k, es) => { const [id, c] = k.split("."); return `${bookName(id, es)} ${c}`; };

// where "Read" sends you: Bible Gateway (web) or the YouVersion Bible app
export function readUrl(k, tr = "NIV", app = "bg") {
  const [id, c] = k.split(".");
  if (app === "yv") return `https://www.bible.com/bible/${TRANSLATIONS[tr]?.yv || 111}/${id}.${c}.${tr}`;
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(`${BOOK[id].en} ${c}`)}&version=${tr}`;
}
export function refUrl(ref, tr = "NIV") {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${tr}`;
}

export const ACTS = [
  ["Adoration", "Praise God for who He is."],
  ["Confession", "Be honest about where you fell short."],
  ["Thanksgiving", "Thank Him for specific things from today."],
  ["Supplication", "Ask — for others first, then for yourself."],
];

// Verse of the day — King James Version (public domain)
export const VERSES = [
  ["John 3:16", "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."],
  ["Proverbs 3:5-6", "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."],
  ["Philippians 4:13", "I can do all things through Christ which strengtheneth me."],
  ["Isaiah 40:31", "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."],
  ["Joshua 1:9", "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."],
  ["Psalm 23:1", "The LORD is my shepherd; I shall not want."],
  ["Romans 8:28", "And we know that all things work together for good to them that love God, to them who are the called according to his purpose."],
  ["Jeremiah 29:11", "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end."],
  ["Matthew 6:33", "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you."],
  ["Philippians 4:6-7", "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."],
  ["1 Corinthians 9:27", "But I keep under my body, and bring it into subjection: lest that by any means, when I have preached to others, I myself should be a castaway."],
  ["1 Corinthians 6:19-20", "What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own? For ye are bought with a price: therefore glorify God in your body, and in your spirit, which are God's."],
  ["1 Timothy 4:8", "For bodily exercise profiteth little: but godliness is profitable unto all things, having promise of the life that now is, and of that which is to come."],
  ["Galatians 6:9", "And let us not be weary in well doing: for in due season we shall reap, if we faint not."],
  ["Hebrews 11:1", "Now faith is the substance of things hoped for, the evidence of things not seen."],
  ["Psalm 119:105", "Thy word is a lamp unto my feet, and a light unto my path."],
  ["Psalm 119:11", "Thy word have I hid in mine heart, that I might not sin against thee."],
  ["2 Timothy 1:7", "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."],
  ["Romans 12:2", "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God."],
  ["Matthew 11:28", "Come unto me, all ye that labour and are heavy laden, and I will give you rest."],
  ["Psalm 46:10", "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth."],
  ["Lamentations 3:22-23", "It is of the LORD'S mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."],
  ["Proverbs 16:3", "Commit thy works unto the LORD, and thy thoughts shall be established."],
  ["James 1:5", "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him."],
  ["1 John 1:9", "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness."],
  ["Psalm 37:4", "Delight thyself also in the LORD; and he shall give thee the desires of thine heart."],
  ["Isaiah 41:10", "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."],
  ["Matthew 5:16", "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven."],
  ["Romans 5:8", "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us."],
  ["Ephesians 2:8-9", "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast."],
  ["1 Thessalonians 5:16-18", "Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you."],
  ["Psalm 118:24", "This is the day which the LORD hath made; we will rejoice and be glad in it."],
  ["Micah 6:8", "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?"],
  ["Proverbs 27:17", "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend."],
  ["John 14:6", "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me."],
  ["2 Corinthians 5:17", "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new."],
  ["Psalm 27:1", "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?"],
  ["Deuteronomy 31:6", "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee."],
  ["Galatians 5:22-23", "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law."],
  ["Psalm 34:8", "O taste and see that the LORD is good: blessed is the man that trusteth in him."],
  ["Hebrews 4:12", "For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart."],
  ["Romans 15:13", "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost."],
  ["Proverbs 4:23", "Keep thy heart with all diligence; for out of it are the issues of life."],
  ["James 4:8", "Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded."],
  ["Psalm 51:10", "Create in me a clean heart, O God; and renew a right spirit within me."],
  ["Isaiah 26:3", "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee."],
  ["Nahum 1:7", "The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him."],
  ["Psalm 118:6", "The LORD is on my side; I will not fear: what can man do unto me?"],
  ["Colossians 3:23", "And whatsoever ye do, do it heartily, as to the Lord, and not unto men;"],
  ["Matthew 7:7", "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:"],
];
