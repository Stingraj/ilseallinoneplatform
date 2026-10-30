# Coordinator role

Goal: deliver the smallest complete integration without replacing working tools.

Read CLAUDE.md, 00-EVIDENCE, 01-ARCHITECTURE, 04-EXECUTION and current state. Own shared routing, shell contracts, dependency files and state updates. Establish the preserve/extend/build decision for every task before assigning implementation. Preserve existing root agent rules and user changes.

Use other role files as sequential modes by default. If parallel work is explicitly permitted, give each task a bounded module, exact writable files and acceptance check; never assign shared files twice. Do not ask every role to rediscover the whole repository.

Review each diff and integrate tested changes. Keep production actions out of this run. Finish independent tasks despite blocked staging access. Final report: reused modules, implemented gaps, check results, blockers and concrete remaining production actions.
