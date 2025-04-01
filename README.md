!function(t,a){"use strict";const e=eval;class s extends a.BasicEvaluator{someEvaluatorState;async evaluateChunk(t){this.someEvaluatorState++,e(t),this.conductor.sendOutput(`Chunk ${this.someEvaluatorState} evaluated!`)}constructor(t){super(t),this.someEvaluatorState=0}}const{runnerPlugin:u,conduit:n}=t.initialise(s)}(_,runner);
//# sourceMappingURL=index.js.map
