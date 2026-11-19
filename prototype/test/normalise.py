"""Filter a test's printed output down to the lines that should be identical on every run."""
import re, sys
for line in sys.stdin:
    line = re.sub(r'^ms \d+$', 'ms N', line)                       # b1: how long matching took
    line = re.sub(r"('ms': )\d+", r'\1N', line)                     # t3: search timings
    line = re.sub(r'(\d{4}-\d\d-\d\dT\d\d:\d\d):\d\d\.\d{3}Z', r'\1:SS.mmmZ', line)   # saved timestamps: keep to the minute
    line = re.sub(r'\b([a-z0-9]{7,9})[a-z0-9]{4}\b', r'\1....', line)   # ids from newId(), with or without a prefix: the last four characters come from the clock
    line = re.sub(r'\d+ visits? in 4 weeks, last [^|]*', 'N visits in 4 weeks, last D ', line)   # t18: sample gym attendance is hashed from ids that include clock milliseconds
    line = re.sub(r'\d+ of (\d+) places left', r'N of \1 places left', line)   # t18: same cause as the visit counts
    line = re.sub(r'Full, \d+ waiting', 'Full, N waiting', line)   # t18: same cause again
    line = re.sub(r'^(mid-stream cards: )\d+', r'\1N', line)   # t19: how many ideas had streamed in when the test looked
    sys.stdout.write(line)
