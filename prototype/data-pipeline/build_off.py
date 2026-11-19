import csv, sys, json, re, collections, os
csv.field_size_limit(10**9)
r=csv.reader(open('/home/claude/data/off_raw.tsv',encoding='utf-8',errors='replace'),delimiter='\t',quoting=csv.QUOTE_NONE)
h=next(r); ix={k:i for i,k in enumerate(h)}
def fl(s):
    try:
        v=float(s)
        return v if v==v and abs(v)<1e7 else None
    except: return None
def r1(x):
    if x is None: return 0
    x=round(x,1); return int(x) if x==int(x) else x
c=collections.Counter()
best={}
for row in r:
    if len(row)!=len(h): continue
    g=lambda k: row[ix[k]]
    name=re.sub(r'\s+',' ',g('product_name')).strip(' .,-')
    if not (2<=len(name)<=70) or not re.search(r'[A-Za-z]{2}',name): c['name']+=1; continue
    if re.search(r'[Ѐ-ӿ؀-ۿ一-鿿぀-ヿ฀-๿]',name): c['script']+=1; continue
    brand=re.sub(r'\s+',' ',g('brands').split(',')[0]).strip()[:32]
    p=fl(g('proteins_100g')); f=fl(g('fat_100g')); cb=fl(g('carbohydrates_100g'))
    k=fl(g('energy-kcal_100g'))
    if k is None:
        e=fl(g('energy_100g'))
        if e is not None: k=e/4.184
    if None in (p,f,cb,k): c['missing']+=1; continue
    if not(0<=p<=100 and 0<=f<=100 and 0<=cb<=100 and 0<=k<=905) or p+f+cb>102: c['range']+=1; continue
    cats=g('categories_tags')
    fib=fl(g('fiber_100g')) or 0
    est=4*p+4*cb+9*f
    alc=('alcoholic' in cats) or ('beers' in cats) or ('wines' in cats) or ('spirits' in cats)
    if not alc:
        tol=max(20,0.2*max(est,k))
        if abs(k-est)>tol and abs(k-(est+2*fib))>tol and abs(k-(est-4*fib))>tol and not (k<est and 'sweeten' in cats or 'chewing-gum' in cats or 'polyol' in cats):
            c['atwater']+=1; continue
    if k==0 and p==0 and f==0 and cb==0 and not ('water' in cats or 'tea' in cats or 'coffee' in cats or 'sodas' in cats or 'drink' in cats or 'beverage' in cats): c['zero']+=1; continue
    ct=g('countries_tags'); ie='en:ireland' in ct; uk='en:united-kingdom' in ct
    s=int(fl(g('unique_scans_n')) or 0); comp=fl(g('completeness')) or 0
    sug=fl(g('sugars_100g')); sat=fl(g('saturated-fat_100g')); salt=fl(g('salt_100g'))
    if sug is not None and (sug<0 or sug>cb+1): sug=None
    if sat is not None and (sat<0 or sat>f+1): sat=None
    if salt is not None and (salt<0 or salt>100): salt=None
    sv=fl(g('serving_quantity'))
    if sv is not None and not (1<=sv<=1500): sv=None
    pk=fl(g('product_quantity'))
    if pk is not None and not (5<=pk<=3000): pk=None
    code=g('code').strip()
    if not re.fullmatch(r'\d{6,14}',code): c['code']+=1; continue
    tier = 0 if ((ie and s>=1) or (uk and s>=3)) else 1
    if tier==1:
        if not ie and not uk and s<40: c['drop_other']+=1; continue
        if uk and not ie and s==0 and comp<0.55: c['drop_uk0']+=1; continue
        if ie and s==0 and comp<0.4: c['drop_ie0']+=1; continue
    rec=[name, brand, int(round(k)), r1(p), r1(cb), r1(f), r1(fib), r1(sug) if sug is not None else -1, r1(sat) if sat is not None else -1, round(salt,2) if salt is not None else -1, r1(sv) if sv else 0, r1(pk) if pk else 0, code, s]
    key=(name.lower(), brand.lower(), rec[2])
    rank=(1-tier, s, comp, ie)
    if key in best and best[key][0]>=rank: c['dupe']+=1; continue
    best[key]=(rank,tier,rec)
core=[v[2] for v in best.values() if v[1]==0]; ext=[v[2] for v in best.values() if v[1]==1]
core.sort(key=lambda x:-x[-1]); ext.sort(key=lambda x:-x[-1])
print(c); print(len(core),len(ext))
for fn,L in [('foods-brands.json',core),('foods-brands-more.json',ext)]:
    with open('/home/claude/app/'+fn,'w') as fo:
        fo.write('[\n'+',\n'.join(json.dumps(x,separators=(',',':'),ensure_ascii=False) for x in L)+'\n]\n')
    print(fn, os.path.getsize('/home/claude/app/'+fn))
import random
random.seed(3)
for x in core[:8]+random.sample(core,8)+random.sample(ext,6): print(x)
