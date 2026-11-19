#!/usr/bin/env bash
# Build the prototype, serve it on port 8765 and run the browser tests.
# Needs: python3, node, `pip install playwright pillow`, and Google Chrome (tests use channel="chrome").
#
# Each test prints what it sees. A test passes when it finishes with no traceback AND its printed
# output matches the stored baseline in test/golden/<name>.txt. The tests run with a fixed clock
# (see test/clock.py) so the output is the same every day.
#
# Usage: ./run-tests.sh              run the core set and compare with the baselines
#        ./run-tests.sh t22 t27      run the named tests
#        ./run-tests.sh --update     run and rewrite the baselines (read the diff before committing)
#        ./run-tests.sh --jobs 4     run up to 4 tests at once (default 3)
# Env:   APP_DIR=path                serve this folder instead of prototype/app (and skip the prototype build)
set -u
here="$(cd "$(dirname "$0")" && pwd)"
update=0; jobs=3; tests=()
while [ $# -gt 0 ]; do
  case "$1" in
    --update) update=1 ;;
    --jobs) shift; jobs="$1" ;;
    *) tests+=("$1") ;;
  esac
  shift
done
[ ${#tests[@]} -eq 0 ] && tests=(t1 t2 t4 t5 t6 t8 t9 t10 t11 t13 t14 t15 t16 t17 t18 t19 t20 t21 t22 t23 t24 t25 t26 t27 b1)

web=0; [ -n "${APP_DIR:-}" ] && web=1
if [ -z "${APP_DIR:-}" ]; then
  python3 "$here/scripts/build.py" || exit 1
  node -e "const h=require('fs').readFileSync('$here/app/index.html','utf8');new Function(h.match(/<script>([\s\S]*)<\/script>/)[1]);console.log('syntax ok')" || exit 1
  APP_DIR="$here/app"
fi
echo "serving $APP_DIR"
(cd "$APP_DIR" && exec python3 -m http.server 8765 >/dev/null 2>&1) &
server=$!
trap 'kill $server 2>/dev/null' EXIT
sleep 1

export TZ=UTC PYTHONPATH="$here/test${PYTHONPATH:+:$PYTHONPATH}"
cd "$here/test"; mkdir -p out golden
for t in "${tests[@]}"; do rm -f "out/$t.prompts"; done
run_one() {
  local t="$1"
  timeout 300 python3 "$t.py" > "out/$t.raw" 2>&1
  # drop lines that legitimately vary between runs (timings)
  python3 "$here/test/normalise.py" < "out/$t.raw" > "out/$t.txt"
}
export -f run_one; export here
printf '%s\n' "${tests[@]}" | xargs -P "$jobs" -I{} bash -c 'run_one {}'

# Baselines: golden/<name>.txt is what the prototype prints. Where the web app is meant to print
# something different, golden/web/<name>.txt holds that instead, so the difference between the two
# files is the full list of intended changes from the prototype.
fail=0
for t in "${tests[@]}"; do
  gold="golden/$t.txt"
  [ $web -eq 1 ] && [ -f "golden/web/$t.txt" ] && gold="golden/web/$t.txt"
  if grep -q "Traceback\|TimeoutError" "out/$t.raw"; then
    echo "FAIL  $t  (error)"; tail -6 "out/$t.raw"; fail=1
  elif [ $update -eq 1 ] && [ $web -eq 1 ]; then
    if [ -f "golden/$t.txt" ] && diff -q "golden/$t.txt" "out/$t.txt" >/dev/null; then rm -f "golden/web/$t.txt"; echo "same as prototype $t"
    else mkdir -p golden/web; cp "out/$t.txt" "golden/web/$t.txt"; echo "saved web/$t"; fi
  elif [ $update -eq 1 ]; then
    cp "out/$t.txt" "golden/$t.txt"; echo "saved $t"
  elif [ ! -f "$gold" ]; then
    echo "FAIL  $t  (no baseline: run with --update)"; fail=1
  elif ! diff -q "$gold" "out/$t.txt" >/dev/null; then
    echo "FAIL  $t  (output differs from baseline $gold)"; diff "$gold" "out/$t.txt" | head -12; fail=1
  else
    echo "ok    $t"
  fi
done
exit $fail
