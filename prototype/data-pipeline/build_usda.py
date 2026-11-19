import json, re, sys
d='/home/claude/data/usda/'
out=[]
def r1(x):
    if x is None: return 0
    x=round(float(x),1)
    return int(x) if x==int(x) else x
def nutr(f):
    m={}
    for n in f.get('foodNutrients',[]):
        nid=n.get('nutrient',{}).get('id'); a=n.get('amount')
        if nid is None or a is None: continue
        m[nid]=a
    return m
def clean_portion(desc):
    desc=re.sub(r'\s+',' ',desc).strip()
    return desc
seen=set()
stats={}
for fn,key,src in [('surveyDownload.json','SurveyFoods','F'),('FoodData_Central_foundation_food_json_2025-12-18.json','FoundationFoods','N'),('FoodData_Central_sr_legacy_food_json_2018-04.json','SRLegacyFoods','S')]:
    L=json.load(open(d+fn))[key]
    for f in L:
        name=re.sub(r'\s+',' ',f['description']).strip()
        m=nutr(f)
        p=m.get(1003); fat=m.get(1004); c=m.get(1005)
        kcal=m.get(1008)
        if kcal is None: kcal=m.get(2048, m.get(2047))
        if p is None or fat is None: 
            stats['skip_nop']=stats.get('skip_nop',0)+1; continue
        if c is None:
            # carbs by difference unavailable: derive if water+ash known
            w=m.get(1051); ash=m.get(1007)
            if w is not None and ash is not None: c=max(0,100-w-ash-p-fat)
            else:
                stats['skip_noc']=stats.get('skip_noc',0)+1; continue
        if kcal is None: kcal=4*p+4*c+9*fat
        key2=name.lower()
        if key2 in seen: continue
        seen.add(key2)
        ports=[]
        for pt in sorted(f.get('foodPortions',[]), key=lambda x:x.get('sequenceNumber',99)):
            g=pt.get('gramWeight')
            if not g or g<=0: continue
            if src=='F':
                desc=pt.get('portionDescription','')
                if not desc or 'not specified' in desc.lower(): continue
            else:
                amt=pt.get('amount'); mod=pt.get('modifier') or ''
                mu=(pt.get('measureUnit') or {}).get('name','')
                if mu in ('undetermined',''): mu=''
                amt_s='' if amt is None else (str(int(amt)) if float(amt)==int(amt) else str(amt))
                desc=' '.join(x for x in [amt_s, mu, mod] if x)
                if pt.get('portionDescription') and not desc: desc=pt['portionDescription']
            desc=clean_portion(desc)
            if not desc or len(desc)>48: continue
            if re.fullmatch(r'[\d.]+ ?(g|gram|grams)',desc): continue
            ports.append([desc, r1(g)])
        ports=ports[:6]
        out.append([name, int(round(kcal)), r1(p), r1(c), r1(fat), r1(m.get(1079)), r1(m.get(2000, m.get(1063))), r1(m.get(1258)), int(round(m.get(1093,0) or 0)), ports, src])
        stats[src]=stats.get(src,0)+1
print(stats, len(out))
with open('/home/claude/app/foods-generic.json','w') as fo:
    fo.write('[\n'+',\n'.join(json.dumps(x,separators=(',',':'),ensure_ascii=False) for x in out)+'\n]\n')
import os
print(os.path.getsize('/home/claude/app/foods-generic.json'))
for q in ['Banana, raw','Egg, whole, boiled or poached','Oatmeal','Chicken breast, grilled']:
    for x in out:
        if x[0].lower().startswith(q.lower()): print(x); break
