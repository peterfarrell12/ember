#!/usr/bin/env bash
# Build the prototype, serve it on port 8765 and run the browser tests.
# Needs: python3, node, `pip install playwright pillow`, and Google Chrome (tests use channel="chrome").
# Usage: ./run-tests.sh            runs the core set
#        ./run-tests.sh t22 t27    runs the named tests
set -u
here="$(cd "$(dirname "$0")" && pwd)"
python3 "$here/scripts/build.py" || exit 1
node -e "const h=require('fs').readFileSync('$here/app/index.html','utf8');new Function(h.match(/<script>([\s\S]*)<\/script>/)[1]);console.log('syntax ok')" || exit 1
(cd "$here/app" && python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
tests=("$@"); [ ${#tests[@]} -eq 0 ] && tests=(t1 t2 t5 t8 t9 t10 t13 t14 t15 t16 t17 t18 t19 t20 t21 t22 t23 t24 t26 t27)
cd "$here/test"; fail=0
for t in "${tests[@]}"; do
  out=$(timeout 300 python3 "$t.py" 2>&1); bad=$(echo "$out" | grep -c "Traceback\|TimeoutError")
  errs=$(echo "$out" | grep "ERRS" | tail -1 | cut -c1-160)
  if [ "$bad" -eq 0 ]; then echo "ok    $t  $errs"; else echo "FAIL  $t"; echo "$out" | tail -6; fail=1; fi
done
pkill -f "http.server 8765" >/dev/null 2>&1
exit $fail
