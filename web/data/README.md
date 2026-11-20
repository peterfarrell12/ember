# Food data the web app adds

`foods-uk.json` is built from McCance and Widdowson's Composition of Foods Integrated Dataset 2021
(Public Health England), published at
https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid

Contains public sector information licensed under the Open Government Licence v3.0.

To rebuild it, download the spreadsheet from that page and run:

```bash
pip install openpyxl
python3 web/scripts/build-uk-foods.py path/to/the-spreadsheet.xlsx
```

The nutrition figures are the dataset's own, per 100 g. The everyday portion sizes (a rasher, a slice of
toast, a bowl of porridge) are not from the dataset: they are typical weights listed in the script, there
so that nobody has to weigh a slice of bread. Every food can still be entered in grams.
