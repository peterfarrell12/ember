/* ================= v3 content: exercises, programs, rehab protocols, recovery routines ================= */
/* id|name|group|equipment|cue */
const EX_RAW = `squat|Back squat|legs|bb|Brace, sit between your hips, knees track over toes, drive up through mid-foot.
fsquat|Front squat|legs|bb|Elbows high, chest tall, sit straight down.
goblet|Goblet squat|legs|db|Weight at your chest, sit deep, elbows inside your knees.
legpress|Leg press|legs|machine|Lower under control, stop short of a hard lockout.
split|Bulgarian split squat|legs|db|Back foot on a bench, drop straight down, front knee over toes.
lunge|Walking lunge|legs|db|Long step, back knee kisses the floor, stay tall.
revlunge|Reverse lunge|legs|db|Step back, drop the back knee, push through the front heel.
stepup|Step-up|legs|db|Whole foot on the box, drive up without pushing off the back leg.
legext|Leg extension|legs|machine|Pause at the top, lower for three seconds.
legcurl|Leg curl|legs|machine|Hips down, curl fully, slow return.
rdl|Romanian deadlift|legs|bb|Soft knees, push hips back, bar close, load the hamstrings.
dbrdl|Dumbbell Romanian deadlift|legs|db|Hips back, flat back, weights slide down your thighs.
trapdl|Trap bar deadlift|legs|bb|Chest up, push the floor away, stand tall.
nordic|Nordic hamstring curl|legs|bw|Lower as slowly as you can, push back up with your hands.
calf|Standing calf raise|legs|machine|Full stretch at the bottom, pause at the top.
seatcalf|Seated calf raise|legs|machine|Knees bent, slow down, pause up.
bwsquat|Bodyweight squat|legs|bw|Sit back and down, heels flat, stand tall.
wallsit|Wall sit|legs|bw|Back flat on the wall, thighs as low as stays comfortable.
hipthrust|Hip thrust|glutes|bb|Chin tucked, ribs down, pause at lockout.
glutebr|Glute bridge|glutes|bw|Heels close, squeeze at the top, lower slowly.
slbridge|Single-leg glute bridge|glutes|bw|Hips level, drive through one heel.
deadlift|Deadlift|back|bb|Bar over mid-foot, lats tight, push the floor away.
pullup|Pull-up|back|bw|Start from a dead hang, chest to the bar, control down.
chinup|Chin-up|back|bw|Palms towards you, pull elbows to ribs.
latpull|Lat pulldown|back|cable|Pull to the top of your chest, elbows down and back.
row|Barbell row|back|bb|Hinge to 45 degrees, pull to the lower ribs.
dbrow|One-arm dumbbell row|back|db|Flat back, pull the elbow to your hip.
cablerow|Seated cable row|back|cable|Tall chest, squeeze shoulder blades, slow return.
chestrow|Chest-supported row|back|machine|Chest on the pad, pull without shrugging.
invrow|Inverted row|back|bw|Body straight, pull your chest to the bar.
pullover|Cable pullover|back|cable|Arms nearly straight, sweep down to your thighs.
shrug|Shrug|back|db|Straight up, pause, straight down.
superman|Superman hold|back|bw|Lift chest and thighs, long neck, hold.
bandrow|Band row|back|band|Squeeze shoulder blades together, pause.
bench|Bench press|chest|bb|Shoulder blades pinned, bar to lower chest, feet planted.
dbbench|Dumbbell bench press|chest|db|Elbows about 45 degrees, press up and slightly in.
incline|Incline dumbbell press|chest|db|Bench at 30 degrees, lower to the upper chest.
inclinebb|Incline bench press|chest|bb|Bar to the upper chest, wrists stacked.
pushup|Push-up|chest|bw|Body in one line, chest to the floor, elbows about 45 degrees.
plyopush|Plyo push-up|power|bw|Explode off the floor, land soft, reset each rep.
dips|Dips|chest|bw|Lean slightly forward, shoulders down, full lockout.
fly|Cable fly|chest|cable|Slight bend in the elbows, hug a barrel.
bandpress|Band chest press|chest|band|Anchor behind you, press and reach.
ohp|Overhead press|shoulders|bb|Glutes tight, bar over mid-foot at lockout.
dbohp|Dumbbell shoulder press|shoulders|db|Press up and slightly in, ribs down.
latraise|Lateral raise|shoulders|db|Lead with the elbows, stop at shoulder height.
reardelt|Rear delt fly|shoulders|db|Hinge over, thumbs forward, sweep wide.
facepull|Face pull|shoulders|cable|Pull to your eyes, elbows high, rotate out.
landmine|Landmine press|shoulders|bb|Half-kneeling, press up and forward.
pike|Pike push-up|shoulders|bw|Hips high, head between your hands.
bandpa|Band pull-apart|shoulders|band|Arms straight, pull the band to your chest.
curl|Barbell curl|arms|bb|Elbows pinned, no swing.
dbcurl|Dumbbell curl|arms|db|Turn the palm up as you lift.
hammer|Hammer curl|arms|db|Thumbs up, elbows still.
tricep|Triceps pushdown|arms|cable|Elbows at your sides, lock out fully.
skull|Skull crusher|arms|bb|Upper arms still, lower to your forehead.
ohtri|Overhead triceps extension|arms|db|Elbows in, full stretch behind the head.
plank|Plank|core|bw|Ribs down, glutes tight, do not sag.
sideplank|Side plank|core|bw|Straight line ear to ankle, hips high.
copen|Copenhagen plank|core|bw|Top leg on a bench, lift hips, squeeze the inner thigh.
deadbug|Dead bug|core|bw|Low back flat, opposite arm and leg, slow.
birddog|Bird dog|core|bw|Reach long, hips square, pause.
pallof|Pallof press|core|cable|Press out and resist the twist.
hangraise|Hanging knee raise|core|bw|No swing, curl the pelvis up.
abwheel|Ab wheel rollout|core|other|Hips tucked, roll only as far as you can hold shape.
woodchop|Cable woodchop|core|cable|Rotate from the hips, arms long.
russian|Russian twist|core|db|Chest tall, rotate the ribcage.
farmer|Farmer carry|core|db|Tall posture, short quick steps.
suitcase|Suitcase carry|core|db|One side loaded, do not lean.
mclimb|Mountain climber|core|bw|Hips low, drive the knees.
kbswing|Kettlebell swing|power|kb|Hinge, snap the hips, arms are ropes.
boxjump|Box jump|power|bw|Jump high, land soft and quiet, step down.
jumpsq|Jump squat|power|bw|Quarter squat, jump tall, soft landing.
trapjump|Loaded jump squat|power|bb|Light load, jump as high as you can, reset each rep.
bandjump|Band-assisted jump|power|band|Let the band speed you up, land soft.
hurdle|Hurdle hops|power|bw|Quick off the ground, tall hips.
latbound|Lateral bound|power|bw|Push sideways, stick the landing on one leg.
pogo|Pogo hops|power|bw|Stiff ankles, short ground contact.
medslam|Medicine ball slam|power|other|Reach tall, slam through the floor.
medrot|Rotational medicine ball throw|power|other|Load the back hip, throw with your whole body.
burpee|Burpee|power|bw|Chest to the floor, jump and clap overhead.
run|Run interval|cond|other|Hold the target pace, relax your shoulders.
skierg|SkiErg|cond|machine|Hinge and pull with your whole body, long strokes.
rowerg|Rowing machine|cond|machine|Legs, then body, then arms. Reverse on the way back.
bike|Bike interval|cond|machine|Smooth cadence, hard but repeatable.
sledpush|Sled push|cond|other|Arms locked, lean in, drive with short steps.
sledpull|Sled pull|cond|other|Sit back, hand over hand, keep the rope moving.
bbj|Burpee broad jump|cond|bw|Chest down, jump forward, land and go again.
sandlunge|Sandbag lunge|cond|other|Bag on your shoulders, knee to the floor each step.
wallball|Wall ball|cond|other|Full squat, throw on the way up, catch and sink.
walk|Walk|cond|bw|Easy pace, nose breathing.
cod|Change-of-direction shuffle|cond|bw|Low hips, push off the outside foot.
extrot|Band external rotation|rehab|band|Elbow pinned to your side, rotate out slowly.
introt|Band internal rotation|rehab|band|Elbow at your side, rotate in with control.
isoext|Isometric shoulder rotation hold|rehab|bw|Press the back of your hand into a wall at about half effort.
scapush|Scapular push-up|rehab|bw|Arms straight, let the chest sink, then push the floor away.
wallslide|Wall slide|rehab|bw|Forearms on the wall, slide up, ribs down.
ytw|Prone Y-T-W|rehab|bw|Thumbs up, lift from the shoulder blades.
pendulum|Pendulum swing|rehab|bw|Lean on a table, let the arm hang and circle gently.
isowrist|Isometric wrist extension hold|rehab|db|Forearm on a table, hold the wrist level.
wristext|Eccentric wrist extension|rehab|db|Lift with help from the other hand, lower alone for five seconds.
supin|Forearm rotation|rehab|other|Hold a hammer by the end, rotate palm up then down, slowly.
grip|Towel grip squeeze|rehab|other|Squeeze a rolled towel, hold five seconds.
wristflexs|Wrist flexor stretch|mobility|bw|Arm straight, palm up, ease the fingers back.
quadset|Quad set|rehab|bw|Leg straight, press the back of the knee down, hold five seconds.
slr|Straight leg raise|rehab|bw|Lock the knee, lift to the height of the other thigh.
tke|Terminal knee extension|rehab|band|Band behind the knee, straighten fully against it.
spanish|Spanish squat hold|rehab|band|Band behind the knees, sit back, shins vertical.
stepdown|Slow step-down|rehab|bw|Lower for three seconds, knee in line with toes.
clam|Clamshell|rehab|band|Feet together, lift the top knee, hips stacked.
sideleg|Side-lying leg raise|rehab|bw|Toes forward, lift from the hip.
monster|Banded lateral walk|rehab|band|Stay low, step wide, do not let the knees cave.
adsqueeze|Adductor ball squeeze|rehab|other|Ball between the knees, squeeze at a comfortable effort.
hipfiso|Isometric hip flexion hold|rehab|band|Lying down, knee at 90 degrees, hold against a band or your hand.
psoas|Banded hip flexion march|rehab|band|Band round the feet, drive one knee up, stay tall.
hipair|Hip airplane|rehab|bw|Stand on one leg, hinge, open and close the hip slowly.
calfiso|Isometric calf hold|rehab|bw|Rise onto your toes and hold, both legs.
heelraise|Double-leg heel raise|rehab|bw|Straight up, pause, slow down.
slheel|Single-leg heel raise|rehab|bw|Full height, three seconds down.
ecccalf|Eccentric heel drop|rehab|bw|Up on two, lower on one off a step.
ankleabc|Ankle alphabet|rehab|bw|Draw the alphabet with your big toe.
bandankle|Band ankle eversion|rehab|band|Turn the foot out against the band, slow back.
balance|Single-leg balance|rehab|bw|Soft knee, hips level, eyes ahead.
hop|Single-leg hop and stick|rehab|bw|Hop forward, land quiet, hold two seconds.
hamiso|Isometric hamstring bridge hold|rehab|bw|Heels on a bench, lift the hips and hold.
hamslide|Hamstring slider curl|rehab|other|Bridge up, slide the heels out slowly.
pelvic|Pelvic tilt|rehab|bw|Flatten your low back to the floor, then release.
mckenzie|Prone press-up|rehab|bw|Hips stay down, press the chest up gently.
catcow|Cat-cow|mobility|bw|Round, then arch, moving one segment at a time.
kneehug|Knee to chest|mobility|bw|Hug one knee in, keep the other leg long.
hipflex|Half-kneeling hip flexor stretch|mobility|bw|Tuck the pelvis, squeeze the glute of the back leg.
couch|Couch stretch|mobility|bw|Back foot up a wall, stay tall, tuck the tail.
hamstr|Hamstring stretch|mobility|bw|Hinge at the hip with a flat back.
pigeon|Pigeon stretch|mobility|bw|Front shin across, square the hips, fold forward.
fig4|Figure-four glute stretch|mobility|bw|Ankle over the opposite knee, pull the legs in.
ninety|90/90 hip switch|mobility|bw|Sit tall, rotate both knees side to side.
adductor|Adductor rock-back|mobility|bw|One leg out to the side, rock the hips back.
cossack|Cossack squat|mobility|bw|Shift side to side, heel down, chest up.
worlds|World's greatest stretch|mobility|bw|Lunge, elbow to instep, then rotate and reach.
tspine|Open book rotation|mobility|bw|Knees stacked, open the top arm, follow it with your eyes.
thread|Thread the needle|mobility|bw|On all fours, reach under and through.
childs|Child's pose|mobility|bw|Sit back to your heels, reach long, breathe.
downdog|Downward dog|mobility|bw|Hips high, pedal the heels.
ankledf|Knee-to-wall ankle mobilisation|mobility|bw|Heel down, drive the knee over the toes to the wall.
calfstr|Calf stretch|mobility|bw|Back heel down, lean into a wall.
doorpec|Doorway pec stretch|mobility|bw|Forearm on the frame, step through.
xbody|Cross-body shoulder stretch|mobility|bw|Pull the arm across your chest.
hang|Dead hang|mobility|bw|Relax the shoulders, breathe.
neck|Neck side stretch|mobility|bw|Ear towards the shoulder, opposite arm long.
foamquad|Foam roll quads|mobility|other|Slow passes, pause on tender spots.
foamcalf|Foam roll calves|mobility|other|Cross one leg over for more pressure.
foamback|Foam roll upper back|mobility|other|Hands behind the head, extend over the roller.`;
const EXS = {}; EX_RAW.split('\n').forEach(l => { const [id, n, g, eq, cue] = l.split('|'); EXS[id] = { id, n, g, eq, cue }; });
const GROUPS = { legs: 'Legs', glutes: 'Glutes', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms', core: 'Core', power: 'Power', cond: 'Conditioning', rehab: 'Rehab', mobility: 'Mobility' };
const EQUIP = { bb: 'Barbell', db: 'Dumbbells', kb: 'Kettlebell', machine: 'Machine', cable: 'Cable', bw: 'Bodyweight', band: 'Band', other: 'Other kit' };
const LIFT_GROUPS = ['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core'];

/* Program templates. Day: [name, focus, [[exercise, sets, reps, rest seconds, note]]] */
const DAY = (n, focus, items) => ({ n, focus, items: items.map(([ex, sets, reps, rest, note]) => ({ ex, sets, reps: String(reps), rest: rest || 0, ...(note ? { note } : {}) })) });
const TEMPLATES = [
  { id: 't-full3', n: 'Full body, 3 days', about: 'Three sessions a week covering everything. The best starting point if you train in a gym.', weeks: 8, tag: 'Gym', days: [
    DAY('Day A', 'Squat and push', [['squat', 4, '5-8', 150], ['bench', 4, '6-10', 120], ['dbrow', 3, '8-12', 90], ['rdl', 3, '8-10', 120], ['latraise', 3, '12-15', 60], ['plank', 3, '45s', 45]]),
    DAY('Day B', 'Hinge and pull', [['deadlift', 3, '4-6', 180], ['ohp', 4, '6-10', 120], ['pullup', 4, '6-10', 120], ['split', 3, '8-10', 90], ['dbcurl', 3, '10-12', 60], ['deadbug', 3, '10', 45]]),
    DAY('Day C', 'Single leg and upper', [['fsquat', 3, '6-8', 150], ['incline', 4, '8-12', 90], ['cablerow', 4, '8-12', 90], ['hipthrust', 3, '8-12', 120], ['tricep', 3, '10-15', 60], ['farmer', 3, '40 m', 60]])] },
  { id: 't-ul4', n: 'Upper and lower, 4 days', about: 'Two upper and two lower sessions. More volume per muscle for building size and strength.', weeks: 8, tag: 'Gym', days: [
    DAY('Upper A', 'Heavy press and row', [['bench', 4, '5-8', 150], ['row', 4, '6-10', 120], ['dbohp', 3, '8-12', 90], ['latpull', 3, '8-12', 90], ['latraise', 3, '12-15', 60], ['tricep', 3, '10-15', 60]]),
    DAY('Lower A', 'Squat focus', [['squat', 4, '5-8', 150], ['rdl', 3, '8-10', 120], ['legpress', 3, '10-12', 90], ['legcurl', 3, '10-12', 60], ['calf', 4, '10-15', 60], ['hangraise', 3, '10-12', 60]]),
    DAY('Upper B', 'Overhead and pull-up', [['ohp', 4, '5-8', 150], ['pullup', 4, '6-10', 120], ['incline', 3, '8-12', 90], ['chestrow', 3, '8-12', 90], ['facepull', 3, '12-15', 60], ['dbcurl', 3, '10-12', 60]]),
    DAY('Lower B', 'Hinge focus', [['trapdl', 4, '4-6', 180], ['split', 3, '8-10', 90], ['hipthrust', 3, '8-12', 120], ['legext', 3, '12-15', 60], ['seatcalf', 3, '12-15', 60], ['pallof', 3, '10', 45]])] },
  { id: 't-home3', n: 'Dumbbells at home, 3 days', about: 'A pair of dumbbells and a bench or chair. Three full-body sessions.', weeks: 8, tag: 'Home', days: [
    DAY('Day A', 'Squat and press', [['goblet', 4, '8-12', 90], ['dbbench', 4, '8-12', 90], ['dbrow', 4, '8-12', 75], ['dbrdl', 3, '10-12', 90], ['latraise', 3, '12-15', 45], ['sideplank', 3, '30s', 30]]),
    DAY('Day B', 'Single leg and pull', [['revlunge', 3, '8-10', 75], ['dbohp', 4, '8-12', 90], ['dbrow', 4, '8-12', 75], ['slbridge', 3, '10-12', 60], ['hammer', 3, '10-12', 45], ['deadbug', 3, '10', 30]]),
    DAY('Day C', 'Power and carry', [['split', 3, '8-10', 90], ['pushup', 4, '8-15', 75], ['dbrdl', 3, '8-10', 90], ['reardelt', 3, '12-15', 45], ['ohtri', 3, '10-12', 45], ['suitcase', 3, '30 m', 45]])] },
  { id: 't-bw3', n: 'Bodyweight starter, 3 days', about: 'No kit. Builds the habit and the basics.', weeks: 6, tag: 'Anywhere', days: [
    DAY('Day A', 'Full body', [['bwsquat', 3, '12-20', 60], ['pushup', 3, '6-15', 60], ['glutebr', 3, '12-15', 45], ['superman', 3, '20s', 30], ['plank', 3, '30s', 30]]),
    DAY('Day B', 'Legs and core', [['revlunge', 3, '8-12', 60], ['pike', 3, '6-10', 60], ['slbridge', 3, '8-12', 45], ['deadbug', 3, '10', 30], ['mclimb', 3, '20', 45]]),
    DAY('Day C', 'Power', [['jumpsq', 3, '8', 60], ['pushup', 3, '6-15', 60], ['wallsit', 3, '40s', 45], ['sideplank', 3, '25s', 30], ['burpee', 3, '8', 60]])] },
  { id: 't-hyrox', n: 'Hyrox build, 4 days', about: 'Strength under fatigue, erg work and compromised running, built around the eight stations.', weeks: 8, tag: 'Hyrox', days: [
    DAY('Strength and sleds', 'Lower strength, then heavy sled work', [['trapdl', 4, '5', 150], ['split', 3, '8', 90], ['sledpush', 6, '20 m', 90, 'Heavier than race weight'], ['sledpull', 6, '20 m', 90], ['farmer', 4, '50 m', 60], ['copen', 3, '20s', 30]]),
    DAY('Engine', 'Threshold running with erg finishers', [['run', 6, '1000 m', 90, 'Race pace, steady across all six'], ['skierg', 4, '500 m', 90], ['wallball', 3, '25', 60]]),
    DAY('Upper and ergs', 'Pulling strength and erg intervals', [['pullup', 4, '6-8', 120], ['dbbench', 4, '8', 90], ['rowerg', 5, '500 m', 75], ['skierg', 5, '250 m', 60], ['bbj', 4, '10', 60]]),
    DAY('Simulation', 'Run, station, run. Practise changing gears.', [['run', 4, '1000 m', 0, 'Straight into the next station'], ['sandlunge', 4, '25 m', 0], ['wallball', 4, '25', 0], ['farmer', 4, '100 m', 120, 'Rest only after each full round'], ['rowerg', 1, '1000 m', 0]])] },
  { id: 't-field2', n: 'Field sport in-season, 2 days', about: 'Two short sessions that keep strength and power up between matches without leaving you flat.', weeks: 10, tag: 'GAA, soccer, rugby', days: [
    DAY('Strength and power', 'Heavy but low volume', [['trapdl', 3, '3-5', 180], ['boxjump', 3, '4', 90], ['split', 3, '6-8', 90], ['chinup', 3, '6-8', 90], ['nordic', 3, '5', 90], ['copen', 3, '20s', 30], ['pallof', 3, '10', 30]]),
    DAY('Speed and resilience', 'Fast and springy', [['fsquat', 3, '4-6', 150], ['latbound', 3, '5', 60, 'Each side'], ['dbbench', 3, '6-8', 90], ['dbrow', 3, '8', 75], ['slheel', 3, '12', 45], ['hipthrust', 3, '6-8', 90], ['sideplank', 3, '30s', 30]])] },
  { id: 't-padel2', n: 'Padel strength and resilience, 2 days', about: 'Rotation, lateral movement and the shoulder and elbow work that keeps you on court.', weeks: 8, tag: 'Padel, tennis', days: [
    DAY('Rotate and push', 'Power from the hips', [['medrot', 3, '6', 60, 'Each side'], ['goblet', 3, '8-10', 90], ['landmine', 3, '8', 75], ['cablerow', 3, '10', 75], ['extrot', 3, '15', 30], ['wristext', 3, '12', 30], ['pallof', 3, '10', 30]]),
    DAY('Move and brace', 'Lateral strength', [['latbound', 3, '5', 60, 'Each side'], ['cossack', 3, '6', 60, 'Each side'], ['split', 3, '8', 90], ['pullup', 3, '6-8', 90], ['facepull', 3, '15', 45], ['calf', 3, '12', 45], ['suitcase', 3, '30 m', 45]])] },
  { id: 't-fct2', n: 'French contrast lower, 2 days', about: 'Heavy lift, jump, loaded jump, assisted jump, back to back. Rest 20 seconds between the four, four minutes after each round.', weeks: 4, tag: 'Power', days: [
    DAY('Squat contrast', 'Four rounds of the complex, then accessories', [['squat', 4, '3', 20, 'Around 80 to 85 percent, fast up'], ['boxjump', 4, '4', 20], ['trapjump', 4, '4', 20, 'About 30 percent of your squat'], ['bandjump', 4, '5', 240, 'Rest four minutes after this one'], ['rdl', 3, '6', 120], ['copen', 3, '20s', 30]]),
    DAY('Hinge contrast', 'Four rounds of the complex, then accessories', [['trapdl', 4, '3', 20, 'Around 80 to 85 percent'], ['hurdle', 4, '4', 20], ['kbswing', 4, '6', 20, 'Heavy and fast'], ['pogo', 4, '10', 240, 'Rest four minutes after this one'], ['split', 3, '6', 90], ['nordic', 3, '5', 90]])] }
];

/* Rehab protocols. Phase: [name, goal, [[exercise, sets, reps, note]]] */
const GATE = 'Move on when pain stays at 3 out of 10 or less during the session and has settled by the next morning, for a week running.';
const FLAGS = 'See a physio or doctor before starting if the joint gave way or locked, you cannot put weight through it, the swelling is getting worse, there is numbness or pins and needles, or pain wakes you at night.';
const PHS = (n, goal, items) => ({ n, goal, items: items.map(([ex, sets, reps, note]) => ({ ex, sets, reps: String(reps), rest: 30, ...(note ? { note } : {}) })) });
const REHAB = [
  { id: 'r-hip', n: 'Hip and groin', intro: 'For groin, adductor and front-of-hip pain that came on with kicking, sprinting or changing direction.', phases: [
    PHS('Settle it', 'Calm the area with holds that do not provoke it.', [['adsqueeze', 5, '10s', 'About half effort'], ['hipfiso', 5, '10s', 'Each side'], ['glutebr', 3, '12'], ['clam', 3, '15', 'Each side'], ['adductor', 2, '10', 'Each side']]),
    PHS('Build strength', 'Load the adductors, hip flexors and glutes through range.', [['copen', 3, '15s', 'Knee on the bench to start'], ['psoas', 3, '10', 'Each side'], ['slbridge', 3, '10', 'Each side'], ['monster', 3, '12', 'Each way'], ['split', 3, '8', 'Pain-free depth'], ['hipair', 2, '6', 'Each side']]),
    PHS('Return to sport', 'Speed, cutting and kicking loads.', [['copen', 3, '25s', 'Foot on the bench'], ['latbound', 3, '5', 'Each side'], ['cossack', 3, '6', 'Each side'], ['revlunge', 3, '8'], ['cod', 4, '20s', 'Build from 60 to 90 percent']])] },
  { id: 'r-calf', n: 'Calf and Achilles', intro: 'For a calf strain or a sore, stiff Achilles.', phases: [
    PHS('Settle it', 'Holds and easy raises to keep the tendon and muscle working.', [['calfiso', 5, '30s'], ['heelraise', 3, '15'], ['ankledf', 2, '10', 'Each side'], ['walk', 1, '10 min', 'Flat ground']]),
    PHS('Build strength', 'Single-leg strength, slow on the way down.', [['slheel', 3, '12', 'Each side'], ['ecccalf', 3, '12', 'Each side'], ['seatcalf', 3, '12'], ['balance', 3, '30s', 'Each side']]),
    PHS('Return to running', 'Spring and impact before full training.', [['pogo', 3, '15'], ['slheel', 3, '8', 'Hold a weight'], ['hop', 3, '5', 'Each side'], ['jumpsq', 3, '6'], ['run', 6, '1 min', 'Easy, with one minute walks']])] },
  { id: 'r-ham', n: 'Hamstring', intro: 'For a pulled or tight hamstring.', phases: [
    PHS('Settle it', 'Gentle holds, no stretching into pain.', [['hamiso', 5, '20s'], ['glutebr', 3, '12'], ['birddog', 3, '8', 'Each side'], ['walk', 1, '10 min']]),
    PHS('Build strength', 'Lengthen under load.', [['hamslide', 3, '8'], ['dbrdl', 3, '10'], ['slbridge', 3, '10', 'Each side'], ['nordic', 2, '4', 'As slow as you can']]),
    PHS('Return to sprinting', 'High-speed running, built up gradually.', [['nordic', 3, '5'], ['rdl', 3, '6'], ['kbswing', 3, '10'], ['run', 6, '40 m', 'Build-ups: 70, 80, then 90 percent']])] },
  { id: 'r-knee', n: 'Knee', intro: 'For pain at the front of the knee with stairs, squatting or running.', phases: [
    PHS('Settle it', 'Quad work that does not irritate the joint.', [['quadset', 3, '10'], ['slr', 3, '10', 'Each side'], ['spanish', 5, '30s'], ['clam', 3, '15', 'Each side']]),
    PHS('Build strength', 'Controlled single-leg loading.', [['stepdown', 3, '8', 'Each side'], ['tke', 3, '15', 'Each side'], ['split', 3, '8', 'Pain-free depth'], ['slbridge', 3, '10', 'Each side'], ['legpress', 3, '12', 'Light']]),
    PHS('Return to sport', 'Landing and direction change.', [['goblet', 3, '8'], ['lunge', 3, '8'], ['jumpsq', 3, '5', 'Soft landings'], ['latbound', 3, '5', 'Each side'], ['hop', 3, '5', 'Each side']])] },
  { id: 'r-ankle', n: 'Ankle sprain', intro: 'For a rolled ankle once you can walk on it.', phases: [
    PHS('Settle it', 'Get the range and basic strength back.', [['ankleabc', 2, '1'], ['heelraise', 3, '15'], ['bandankle', 3, '15', 'Each side'], ['ankledf', 2, '10', 'Each side'], ['balance', 3, '30s', 'Each side']]),
    PHS('Build strength', 'Single-leg control.', [['slheel', 3, '12', 'Each side'], ['balance', 3, '30s', 'Eyes closed'], ['stepdown', 3, '8', 'Each side'], ['monster', 3, '12', 'Each way']]),
    PHS('Return to sport', 'Hopping, landing and cutting.', [['pogo', 3, '15'], ['hop', 3, '5', 'Each side'], ['latbound', 3, '5', 'Each side'], ['cod', 4, '20s']])] },
  { id: 'r-back', n: 'Lower back', intro: 'For an ordinary stiff or sore lower back.', flags: 'Go to an emergency department if you lose bladder or bowel control, have numbness around the saddle area, or a leg goes weak. See a doctor if pain follows a fall, wakes you at night, or runs below the knee.', phases: [
    PHS('Settle it', 'Gentle movement. Rest makes backs worse.', [['pelvic', 2, '10'], ['catcow', 2, '10'], ['kneehug', 2, '20s', 'Each side'], ['mckenzie', 2, '8'], ['walk', 1, '10 min']]),
    PHS('Build strength', 'Trunk control and hips.', [['birddog', 3, '8', 'Each side'], ['deadbug', 3, '8', 'Each side'], ['glutebr', 3, '12'], ['sideplank', 3, '20s', 'Each side'], ['hipflex', 2, '30s', 'Each side']]),
    PHS('Return to lifting', 'Load the hinge and the carry again.', [['goblet', 3, '8'], ['dbrdl', 3, '8'], ['farmer', 3, '30 m'], ['pallof', 3, '10', 'Each side'], ['suitcase', 3, '20 m', 'Each side']])] },
  { id: 'r-shoulder', n: 'Shoulder', intro: 'For pain reaching overhead or out to the side.', phases: [
    PHS('Settle it', 'Easy movement and holds.', [['pendulum', 2, '30s'], ['isoext', 5, '10s'], ['scapush', 2, '10'], ['wallslide', 2, '10']]),
    PHS('Build strength', 'Rotator cuff and shoulder blade control.', [['extrot', 3, '15'], ['introt', 3, '15'], ['ytw', 2, '8'], ['bandrow', 3, '12'], ['facepull', 3, '12']]),
    PHS('Return to sport', 'Pressing and throwing loads.', [['landmine', 3, '8'], ['pushup', 3, '10'], ['dbohp', 3, '10', 'Light'], ['medrot', 3, '6', 'Each side']])] },
  { id: 'r-elbow', n: 'Elbow', intro: 'For pain on the outside of the elbow from gripping or hitting: tennis or padel elbow.', phases: [
    PHS('Settle it', 'Holds take the edge off tendon pain.', [['isowrist', 5, '30s'], ['grip', 3, '10'], ['wristflexs', 2, '30s']]),
    PHS('Build strength', 'Slow lowering to rebuild the tendon.', [['wristext', 3, '12'], ['supin', 3, '12'], ['hammer', 3, '12', 'Light'], ['bandrow', 3, '12']]),
    PHS('Return to hitting', 'Heavier loads, then build court time gradually.', [['wristext', 3, '8', 'Heavier'], ['farmer', 3, '30 m'], ['dbrow', 3, '10'], ['medrot', 3, '6', 'Each side']])] }
];

/* Timed follow-along routines. Step: [name, seconds, cue] */
const side = (n, s, cue) => [[n + ', left', s, cue], [n + ', right', s, cue]];
const ROUTINES = [
  { id: 'q-morning', n: 'Morning mobility', about: 'Wakes up hips, spine and shoulders.', steps: [['Cat-cow', 60, 'Slow, one segment at a time'], ...side("World's greatest stretch", 45, 'Elbow to instep, then rotate and reach'), ['90/90 hip switches', 60, 'Sit tall'], ...side('Open book rotation', 40, 'Follow your hand with your eyes'), ['Downward dog', 45, 'Pedal the heels'], ['Deep squat hold', 60, 'Elbows push the knees out'], ["Child's pose", 45, 'Long exhales']] },
  { id: 'q-after', n: 'After a match or run', about: 'Brings you down and eases calves, hamstrings and hips.', steps: [...side('Calf stretch', 40, 'Back heel down'), ...side('Hamstring stretch', 45, 'Flat back, hinge at the hip'), ...side('Hip flexor stretch', 45, 'Tuck the pelvis'), ...side('Pigeon stretch', 60, 'Square the hips'), ['Adductor rock-back', 60, 'Swap sides halfway'], ['Legs up the wall', 90, 'Breathe in for four, out for six']] },
  { id: 'q-hips', n: 'Hips and glutes', about: 'For tight hips and glutes.', steps: [['90/90 hip switches', 90, 'Slow and tall'], ...side('Figure-four glute stretch', 60, 'Pull the legs in'), ...side('Pigeon stretch', 75, 'Fold forward'), ...side('Couch stretch', 60, 'Stay tall'), ['Adductor rock-back', 60, 'Swap sides halfway'], ['Deep squat hold', 45, 'Shift side to side']] },
  { id: 'q-desk', n: 'Desk reset', about: 'Five minutes to undo sitting.', steps: [...side('Neck side stretch', 30, 'Opposite arm long'), ['Doorway pec stretch', 45, 'Step through gently'], ...side('Thread the needle', 40, 'Reach under and through'), ['Cat-cow', 40, 'Slow'], ...side('Hip flexor stretch', 30, 'Tuck the pelvis')] },
  { id: 'q-roll', n: 'Foam roll', about: 'Legs and upper back.', steps: [...side('Quads', 60, 'Slow passes, pause on tender spots'), ...side('Calves', 45, 'Cross one leg over for pressure'), ...side('Glutes', 45, 'Sit on the roller, ankle over knee'), ['Upper back', 90, 'Hands behind your head, extend over']] },
  { id: 'q-breath', n: 'Box breathing', about: 'Four minutes to settle your system before bed or after training.', steps: Array.from({ length: 15 }, () => [['Breathe in', 4, 'Through the nose'], ['Hold', 4, 'Stay relaxed'], ['Breathe out', 4, 'Slow and complete'], ['Hold', 4, 'Stay relaxed']]).flat() }
];
