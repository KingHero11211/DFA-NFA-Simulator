"""Build the final technical report from source, measured summaries and real screenshots.
Development-only requirements: reportlab, Pillow. The simulator needs neither.
"""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, Preformatted
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from PIL import Image as PILImage

ROOT=Path(__file__).resolve().parents[1]
HERE=Path(__file__).resolve().parent
OUT=HERE/'technical-report.pdf'
UNIT=json.loads((ROOT/'validation/unit-summary.json').read_text(encoding='utf-8'))
BROWSER=json.loads((ROOT/'validation/browser-summary.json').read_text(encoding='utf-8'))
MANUAL=json.loads((ROOT/'validation/manual-summary.json').read_text(encoding='utf-8'))
arial=Path('C:/Windows/Fonts/arial.ttf')
if arial.exists():
    pdfmetrics.registerFont(TTFont('Body',str(arial)))
    pdfmetrics.registerFont(TTFont('BodyBold','C:/Windows/Fonts/arialbd.ttf'))
    pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='Body',boldItalic='BodyBold')
    FONT,BOLD='Body','BodyBold'
else: FONT,BOLD='Helvetica','Helvetica-Bold'
NAVY=colors.HexColor('#17324d'); BLUE=colors.HexColor('#185adb'); PALE=colors.HexColor('#edf3f9'); GRAY=colors.HexColor('#536477')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportTitle',fontName=BOLD,fontSize=27,leading=33,textColor=colors.black,spaceAfter=18))
styles.add(ParagraphStyle(name='Section',fontName=BOLD,fontSize=18,leading=23,textColor=NAVY,spaceAfter=13))
styles.add(ParagraphStyle(name='Sub',fontName=BOLD,fontSize=12,leading=16,textColor=NAVY,spaceBefore=10,spaceAfter=7))
styles.add(ParagraphStyle(name='Text',fontName=FONT,fontSize=10.1,leading=14.2,spaceAfter=9))
styles.add(ParagraphStyle(name='SmallText',fontName=FONT,fontSize=8.3,leading=11.5,spaceAfter=7,textColor=GRAY))
styles.add(ParagraphStyle(name='Cell',fontName=FONT,fontSize=8.8,leading=12))
styles.add(ParagraphStyle(name='HeadCell',fontName=BOLD,fontSize=8.8,leading=12,textColor=colors.white))
styles.add(ParagraphStyle(name='CodeBlock',fontName='Courier',fontSize=8.2,leading=11.2,spaceBefore=4,spaceAfter=9))
story=[];width=A4[0]-104
def p(s,style='Text'):story.append(Paragraph(escape(s),styles[style]))
def rich(s,style='Text'):story.append(Paragraph(s,styles[style]))
def h(s):p(s,'Sub')
def page(title):
    if story:story.append(PageBreak())
    p(title,'Section')
def t(head,rows,widths=None):
    cells=[[Paragraph(escape(str(v)),styles['HeadCell']) for v in head]]+[[Paragraph(escape(str(v)),styles['Cell']) for v in row] for row in rows]
    tab=Table(cells,colWidths=widths or [width/len(head)]*len(head),repeatRows=1,hAlign='LEFT')
    tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#d2dce7'))]))
    story.append(tab);story.append(Spacer(1,9))
def screenshot(name,w=width,caption=''):
    file=ROOT/'docs/screenshots'/name
    with PILImage.open(file) as image:iw,ih=image.size
    story.append(Image(str(file),width=w,height=w*ih/iw,hAlign='CENTER'))
    if caption:p(caption,'SmallText')
def code(s):story.append(Preformatted(s,styles['CodeBlock']))
def architecture():
    d=Drawing(width,245)
    boxes=[(0,180,'Question or regex','Language description'),(126,180,'Parser','Formal condition / AST'),(252,180,'FA compiler','Construct / minimize'),(378,180,'Automaton model','Q, alphabet, rules, F'),(0,90,'Manual editor','States and transitions'),(126,90,'Validator','Check model and word'),(252,90,'Simulation engine','Sets and snapshots'),(378,90,'SVG visualizer','States and used edges'),(0,0,'Test runner','Expected vs generated'),(126,0,'Controls','Run / Step / Back'),(378,0,'Trace and result','History and verdict')]
    for x,y,title,sub in boxes:
        d.add(Rect(x,y,110,55,fillColor=PALE,strokeColor=colors.HexColor('#7f9bb7'),strokeWidth=.7))
        d.add(String(x+7,y+33,title,fontName=BOLD,fontSize=8.6,fillColor=NAVY))
        d.add(String(x+7,y+15,sub,fontName=FONT,fontSize=6.9,fillColor=GRAY))
    def arrow(x1,y1,x2,y2):
        d.add(Line(x1,y1,x2,y2,strokeColor=BLUE,strokeWidth=1))
        import math
        a=math.atan2(y2-y1,x2-x1);u=5
        pts=[x2,y2,x2-u*math.cos(a-.5),y2-u*math.sin(a-.5),x2-u*math.cos(a+.5),y2-u*math.sin(a+.5)]
        d.add(Polygon(pts,fillColor=BLUE,strokeColor=BLUE))
    for args in [(110,208,126,208),(236,208,252,208),(362,208,378,208),(433,180,307,145),(110,118,126,118),(236,118,252,118),(362,118,378,118),(181,55,290,90),(55,55,270,90),(307,90,433,55)]:arrow(*args)
    story.append(d);story.append(Spacer(1,10))

# 1
p('DFA NFA String Processing Visualizer','ReportTitle')
p('Final technical report with question to automaton construction','Sub')
p('CSET302 Automata Theory and Computability | B.Tech CSE')
p('Aaryan | Prejval Yadav | Sakshi','Sub')
p('Final evaluation: 23-27 November 2026. Report and validation date: 25 November 2026. Version 2.0.')
story.append(Spacer(1,30));h('Abstract')
p('State Studio is an offline learning simulator for DFA, NFA and epsilon-NFA string processing. A user can enter a supported language question, a regular expression or a manual automaton definition. The project constructs the machine, draws its graph, records the active states after every symbol and explains acceptance or rejection. The question extension translates explicit pattern, count, length and divisibility conditions into finite automata; Boolean combinations use products and complement. Regex mode uses Thompson construction, epsilon removal, reachable subsets and partition refinement. The implementation separates pure formal algorithms from the interface and validates results against independent predicates and native regex evaluation.')
p(f'The current evidence contains {UNIT["total"]:,} unit/construction/UI-event checks and {BROWSER["checks"]} real browser integration checks, all passing. Real application screenshots, manually specified expected/actual cases and reproducible source are supplied. The question grammar is bounded and disclosed; unsupported wording is refused rather than guessed.')
h('Delivered package')
t(['Deliverable','Location'],[['Working offline application','index.html and prototype/'],['Source, test code and measured evidence','prototype/, tests/, validation/'],['Technical report, screenshots and viva material','report/, docs/']], [190,width-190])
p('AI-assisted development was used. Each team member remains responsible for reviewing, testing and explaining their allocated part. Roll numbers and institution-specific administrative details should be added by the team if required.','SmallText')
# 2
page('Contents and final evaluation mapping')
t(['Section','Report page'],[['Theory and formal specification','3'],['Requirements and architecture','4'],['Question construction methodology','5'],['Regex construction and correctness','6'],['Implementation and question interface','7'],['Simulation interface','8'],['Manual validation examples','9'],['Test strategy and measured results','10'],['Browser evidence','11'],['Live demo and individual accountability','12'],['Limits conclusion and references','13']],[width-75,75])
h('Rubric coverage')
t(['Criterion','Marks','Evidence'],[['Implementation of simulator features','2','Dynamic inputs, construction, all models, visualization and controls'],['Demonstration and testing','2','Live cases, independent checks, real browser runs and CSV rows'],['Technical documentation and report','2','Theory, methods, architecture, implementation, screenshots and results'],['Report format and code documentation','1','Structured report, readable source, module guide and comments'],['Presentation and technical explanation','1','Demo/viva guide and correct hand traces'],['Individual contribution and teamwork','1','Ownership and member verification record'],['Total','9','Working simulator plus evidence and understanding']],[160,42,width-202])
# 3
page('Theory and formal specification')
p('A finite automaton recognizes a regular language. It reads a finite string over a finite alphabet and uses its current state to summarize the relevant prefix. Different state structures may recognize the same language.')
t(['Part','Meaning','Ends in 01 example'],[['Q','Finite nonempty state set','{q0,q1,q2}'],['Sigma','Input alphabet','{0,1}'],['delta','Transition rule','Table on page 9'],['q0','Start state','q0'],['F','Accepting state set','{q2}']],[60,230,width-290])
h('DFA')
p('M = (Q, Sigma, delta, q0, F), where delta maps Q x Sigma to exactly one state in Q. It must be complete in this implementation. The extended transition follows all symbols in sequence. A word is accepted exactly when the state reached after the complete word belongs to F.')
h('NFA')
p('The transition rule maps Q x Sigma to a set of states. Missing transitions mean the empty set. An NFA accepts if at least one full-input computation reaches F. The engine tracks the union of all reachable states at each position instead of selecting a single arbitrary branch.')
h('Epsilon NFA')
p('An epsilon transition reads no symbol. E(S) includes every state reachable from S through zero or more such moves, including S. Initially use E({q0}); after each symbol use E(move(S,a)). Apply closure after the last symbol too. A visited set ensures termination even with epsilon cycles.')
h('Input and acceptance conventions')
p('Blank input means the empty string. A visible epsilon character is reserved and is not an alphabet symbol. Inputs outside the alphabet give INPUT ERROR rather than a rejection claim about a word in Sigma*. Empty input can accept when the initial closed set intersects F. The accepted language L(M) is the set of words accepted after complete consumption.')
# 4
page('Requirements and architecture')
p('Users can construct a machine from a question or regex, load one of six presets, or edit/import states and transitions. The program must show intermediate computations and validate its outputs. All runtime assets are local.')
architecture()
t(['Module','Responsibility'],[['Input manager and validator','Read definitions, check membership, alphabet, start/finals and DFA completeness'],['Question interpreter and compiler','Parse supported conditions; construct, convert and minimize automata'],['Automaton model','One JSON representation shared by editor and formal algorithms'],['Simulation engine','Compute active sets, epsilon closures, snapshots and verdict'],['Visualizer and controls','SVG graph, active edges/states, playback, speed, zoom and Back'],['Trace result and path panel','Consumed prefix, state-set history, reason, branches and accepting paths'],['Test runner','Compare current machine against supplied/reference expectations; export CSV']],[155,width-155])
p('The pure engine and compiler have no DOM dependency. Back selects an earlier saved snapshot; timers affect display timing only. Edits invalidate old traces. Failed parsing/import never replaces the last valid machine.','SmallText')
# 5
page('Question construction methodology')
p('The teacher-requested extension removes the need to hand-enter every state and transition for supported language questions. It uses a deterministic controlled-language parser, not an unrestricted AI service. This makes construction repeatable, offline and explainable.')
code('question -> alphabet and condition AST\n         -> primitive complete DFAs\n         -> product / complement\n         -> partition refinement\n         -> machine + construction explanation + reference cases')
t(['Condition family','Example','Construction'],[['Pattern','Ends in 1100101','Matched-prefix progress and fallback'],['Prefix / exact word','Starts with ab; exactly "010"','Position states and trap'],['Symbol counts','Exactly 17 ones; odd number of 0s','Exact/saturated/modular counters'],['Length','Length at most 4','Counter advanced on every symbol'],['Binary value','Numbers divisible by 3','Remainder update (2*r+bit) mod 3'],['AND / OR','Even 1s AND odd 0s','Reachable pair product'],['NOT','Does not contain 11','Flip finals of a complete DFA']],[95,180,width-275])
h('Interpretation and boundaries')
p('Every condition is fully matched. OR is parsed before AND so AND binds more tightly; parentheses change grouping. Explicit alphabets are checked against the alphabet field. Numeric divisibility treats input as a nonempty unsigned binary word, allows leading zeros, and accepts zero. Counts and lengths include zero in modular/even cases.')
p('Generated tests use direct string/count/arithmetic predicates evaluated from the interpreted condition, independently of automaton transitions. Authored wording tests also compare each known question to separately written expectations. The user reviews the displayed interpretation before accepting it as the intended question.')
# 6
page('Regex construction and correctness')
h('Regex compilation')
p('Recursive descent parses union, concatenation, grouping and postfix repetition into a syntax tree. Thompson construction creates epsilon-NFA fragments. Epsilon removal yields an NFA when requested; reachable-subset construction yields a complete DFA. Partition refinement merges equivalent DFA states. Union uses |; postfix + means one or more. Matching is whole-string, not substring search. [R1, R2]')
code('S = epsilon_closure({start})   # ENFA only; otherwise {start}\nrecord snapshot 0\nfor symbol in input:\n    S = union(delta(q, symbol) for q in S)\n    S = epsilon_closure(S)    # ENFA only\n    record snapshot\naccept iff S intersects final_states')
h('Correctness invariants')
p('After i symbols, the active set equals precisely the states reachable after that prefix. Initially this follows from the start/closure rule. A symbol move takes every possible labelled successor and no other state; closure adds every free successor. Induction preserves the invariant. The final intersection test is therefore the definition of acceptance.')
p('For construction, pattern states store the relevant matched prefix; counters store the count/remainder. A product stores both component states, so its AND/OR final rule implements intersection/union. Complement is sound because machines are complete. Thompson fragments follow regex operators; reachable subsets preserve possible runs; refinement merges states only when their final status and successor-block behavior agree.')
t(['Operation','Complexity or bound'],[['Indexed DFA processing','O(n) transition work; O(n) stored trace'],['Epsilon closure','O(V + E_epsilon)'],['NFA/ENFA processing','Conservative O((n+1)(V+E)) with trace'],['Thompson construction','Linear in regex structure for fixed alphabet'],['Subset and product','Potentially exponential / V1*V2; abort beyond 128 states'],['Path display','Potentially exponential; separately cap output at 1,500 nodes']],[165,width-165])
p('The path enumerator keeps parent-linked histories, marks dead branches, and summarizes repeated (state,position) epsilon cycles. Its display limit never determines the acceptance banner.','SmallText')
# 7
page('Implementation and question interface')
p('The builder accepts a question or regex and output type. Generation first constructs and validates the complete candidate, then atomically loads the editor and graph. Errors leave a working machine intact. Construction steps, model statistics and the interpreted condition stay visible.')
screenshot('01-question-construction.png',caption='Figure 1. Actual browser run: a conjunction of parity conditions generated a four-state DFA and 41 reference test cases.')
t(['Source file','Implementation role'],[['engine.js','Validation, closure, state-set simulation and paths'],['compiler.js','Pattern/counter/product construction, regex, conversions and minimization'],['questions.js','Controlled-language parser and independent reference predicates'],['presets.js','Six preset definitions and 13 expected cases each'],['app.js','Editor, SVG, snapshots, generation integration and downloads']],[105,width-105])
p('The source is formatted for review and contains module/function comments. The application uses no framework or server. Classic scripts support local file opening. JSON import/export shares the same machine shape as the pure engine. Native browser APIs download SVG and actual CSV test results.')
# 8
page('Simulation interface')
p('The graph highlights all currently active states and edges used in the selected snapshot. The trace and consumed/remaining input update together. Controls provide Run/Pause, Step, Back, Reset and delay; zoom supports larger machines. Accepting states have double circles.')
screenshot('02-dfa-accepted.png',w=425,caption='Figure 2. Actual parity-product simulation on 101: two 1s and one 0 satisfy the question. The generated accepting state is q1; generated names need not match the separate hand example on page 9.')
p('The generated model is still editable. Editing marks its construction explanation and original expectations as stale. Users should regenerate or update expectations for the new language. UI error/status messages use text as well as color. Mobile layout and real JSON/SVG/CSV downloads were exercised in browser checks.')
# 9
page('Manually validated examples')
p('For binary strings ending in 01: start q0, final {q2}. DFA rules: q0 on 0 -> q1, on 1 -> q0; q1 on 0 -> q1, on 1 -> q2; q2 on 0 -> q1, on 1 -> q0.')
h('DFA accepted and rejected inputs')
t(['Step','Read','State for 0101','Reason'],[['0','-','q0','Initial'],['1','0','q1','Suffix 0'],['2','1','q2','Prefix accepted, input remains'],['3','0','q1','Last symbol now 0'],['4','1','q2','All input read: ACCEPTED']],[40,45,130,width-215])
p('Input 010 follows q0 -> q1 -> q2 -> q1 and REJECTS. Reaching q2 before the last symbol is insufficient.')
h('NFA for the same language')
p('Rules: q0 on 0 -> {q0,q1}, on 1 -> {q0}; q1 on 1 -> {q2}; all other moves are empty.')
t(['Prefix','Active set','Observation'],[['empty','{q0}','Initial'],['0','{q0,q1}','Branch on the possible final 0'],['01','{q0,q2}','q2 reached before end'],['010','{q0,q1}','Early q2 branch dies'],['0101','{q0,q2}','Full input includes final q2: ACCEPTED']],[70,135,width-205])
h('Epsilon NFA for a*b')
p('Rules: q0 --epsilon--> q1; q1 --a--> q1; q1 --b--> q2, final {q2}. Initial closure is {q0,q1}. For aab the successive sets are {q0,q1}, {q1}, {q1}, {q2}: ACCEPTED. Blank and a reject. Input b accepts with zero a symbols.')
p('These original named-state hand traces are asserted exactly in engine tests. Additional generated-machine traces and 28 manually specified expectations are exported in validation/manual-and-generated.csv.','SmallText')
# 10
page('Test strategy and measured results')
p(f'Results were executed on 25 November 2026 with Node {UNIT["node"]} and a real Chromium-family browser version {BROWSER["browser"]}. Tests use independent language predicates/native regex evaluation in addition to the state-set engine. The browser tests operate actual controls, downloads and responsive layout.')
t(['Suite','Passed','Evidence'],[['Base engine and presets',f'{UNIT["suites"][0]["passed"]:,}','78 documented cases, exact traces and structural boundaries'],['Automaton construction',f'{UNIT["suites"][1]["passed"]:,}','Authored questions, all models, regex oracles and random expressions'],['UI-event logic',str(UNIT['suites'][2]['passed']),'DOM stand-in checks, generation and stale-state handling'],['Real browser integration',str(BROWSER['checks']),'Editor, questions, playback, imports/downloads, mobile and no page errors'],['Total development + browser checks',f'{UNIT["total"]+BROWSER["checks"]:,}','Zero failures in recorded final run']],[145,65,width-210])
h('Selected expected and actual results')
t(['Language','Input','Expected / actual'],[['Ends in 01','0101','ACCEPTED / ACCEPTED'],['Ends in 01','010','REJECTED / REJECTED'],['Even 1s AND odd 0s','101','ACCEPTED / ACCEPTED'],['Even 1s AND odd 0s','11','REJECTED / REJECTED'],['Exactly two 1s','111','REJECTED / REJECTED'],['Binary numbers divisible by 3','110','ACCEPTED / ACCEPTED'],['Binary numbers divisible by 3','empty','REJECTED / REJECTED'],['Alphabet {0,1}','2','INPUT ERROR / INPUT ERROR']],[190,70,width-260])
p(f'Separate evidence exports contain 78 preset rows and {MANUAL["cases"]} manually specified generated-machine cases. construction-results.csv contains detailed selected question/regex comparisons. Browser CSV downloads are also retained. Some suites intentionally overlap; these counts are checks, not distinct language proofs. Finite testing cannot establish correctness for every possible word.')
# 11
page('Browser evidence')
screenshot('03-nfa-paths.png',w=450,caption='Figure 3. Actual NFA path table after completion. Parent IDs preserve branches; green rows identify accepting parent chains. Dead/non-accepting endpoints remain visible.')
story.append(Spacer(1,10))
screenshot('05-validation-panel.png',w=450,caption='Figure 4. Actual browser validation panel. The 13 preset expectations match generated results and can be downloaded as CSV.')
p('Additional real screenshots in docs/screenshots include epsilon simulation, mobile builder layout and the full application. No design mock-up is used as evidence of a successful run.','SmallText')
# 12
page('Live demo and individual accountability')
t(['Step','Demonstration'],[['1','Generate even 1s AND odd 0s; review interpretation; 101 accepts and 11 rejects'],['2','Step through ends-in-01 on 0101, use Back, then reject 010'],['3','Generate NFA for ends-in-01 and show active sets and an accepting path'],['4','Regex a*b as ENFA: show initial closure, accept aab/b and reject blank'],['5','Show an invalid symbol and refusal of an unknown/nonregular question'],['6','Run expected cases, download CSV, export/import a machine JSON']],[40,width-40])
h('Assigned review and presentation ownership')
t(['Member','Responsibility and individual check'],[['Aaryan','Problem/specification and question interpretation. Change a pattern/count and explain supported-language boundaries.'],['Prejval Yadav','Architecture, editor, graph and controls. Explain snapshots, input validation, Step/Back and workflow.'],['Sakshi','Construction, simulation and tests. Explain closure, products/subsets and a hand trace; compare expected and actual output.']],[110,width-110])
p('These are responsibility allocations, not verified authorship claims. Each member must enter their roll number and actual reviewed/changed/tested work in docs/TEAM_RESPONSIBILITIES.md. AI assistance is disclosed. The team should update the record if its actual allocation differs.')
h('Questions every member should handle')
p('Explain the five-tuple; why one NFA branch is sufficient; why the complete word must be consumed; what epsilon closure includes; how the question parser differs from unrestricted AI; why a deterministic construction can also be a valid NFA; and why a bounded path display cannot change the verdict. Each member should personally run the demo before evaluation.')
# 13
page('Limits conclusion and references')
h('Implemented scope and limitations')
p('The question grammar covers literal starts/ends/contains, exact words, counts, modular conditions, lengths, binary divisibility and Boolean composition, with documented English and limited Hinglish forms. It refuses unrecognized wording. Unbounded equal counts and nonregular languages such as a^n b^n cannot be solved by a finite automaton. Regex is a formal route for other regular languages, within supported syntax and limits.')
p('Limits are 128 construction/machine states, 12 alphabet symbols, 300 input symbols, 40-symbol literal patterns, counts/divisors 0-40 with positive modulus/divisor, and 160 regex characters. Regexes may hit the construction limit earlier. Subset/product blowup is reported as an error, never as a partial answer. Large path views stop at 1,500 nodes with a warning and summarize epsilon cycles. Dense graph edges can overlap; zoom, transitions and traces remain available.')
h('Conclusion')
p('The final project completes the offline construction and visualization workflow, including the requested question input, dynamic editing, all three finite-automaton models, computation playback, independent test expectations and real browser evidence. Its formal algorithms are separated from presentation so the code can be tested and explained. The result is a working teaching tool with explicit scope, rather than a claim to solve arbitrary natural-language problems.')
h('References')
refs=[('R1','University of Rochester, finite automata and regular expressions course notes','https://www.cs.rochester.edu/u/sandhya/csc173/notes/04_fa_and_re.pdf'),('R2','JFLAP tutorial, NFA to DFA conversion','https://jflap.org/tutorial/fa/nfa2dfa/index.html'),('R3','JFLAP tutorial, finite automaton construction and simulation','https://jflap.org/csed/jflap/tutorial/fa/createfa/fa.html'),('R4','Automatarium official repository','https://github.com/automatarium/automatarium'),('R5','Automata Tutor v3, authors paper','https://arxiv.org/abs/2005.01419'),('R6','automata-lib official repository','https://github.com/caleb531/automata')]
for key,title,url in refs:rich(f'[{key}] <link href="{escape(url)}" color="#185adb">{escape(title)}</link>.','SmallText')
p('The tool-review sources informed the design baseline. Current platform-access/offline details not tested directly remain marked to be verified. Source code, tests and measured local evidence are primary references for this implementation.','SmallText')

def footer(canvas,doc):
    canvas.saveState();canvas.setFont(FONT,8);canvas.setFillColor(GRAY)
    canvas.drawString(52,25,'CSET302 | State Studio | Final technical report')
    canvas.drawRightString(A4[0]-52,25,str(doc.page));canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=52,leftMargin=52,topMargin=48,bottomMargin=43,title='DFA NFA String Processing Visualizer Final Technical Report',author='Aaryan, Prejval Yadav, Sakshi')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print('Created',OUT)
