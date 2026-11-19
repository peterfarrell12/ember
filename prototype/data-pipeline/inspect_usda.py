import json, sys
d='/home/claude/data/usda/'
for fn,key in [('FoodData_Central_sr_legacy_food_json_2018-04.json','SRLegacyFoods'),('surveyDownload.json','SurveyFoods'),('FoodData_Central_foundation_food_json_2025-12-18.json','FoundationFoods')]:
    j=json.load(open(d+fn))
    print(fn, list(j.keys()))
    L=j[list(j.keys())[0]]
    print(len(L))
    f=L[100]
    print({k:(v if not isinstance(v,(list,dict)) else type(v).__name__) for k,v in f.items()})
    print('nutr sample', json.dumps(f['foodNutrients'][:2])[:600])
    print('portions', json.dumps(f.get('foodPortions',[])[:3])[:900])
    if 'wweiaFoodCategory' in f: print(f['wweiaFoodCategory'])
    if 'foodCategory' in f: print(f['foodCategory'])
