# vv — example project

A minimal repo showing the whole loop in one directory. The guard forbids TODO/FIXME
markers, and the mutation proves it can fail by seeding one.

```bash
cd sdk/example-project

node ../vv.mjs run      # runs the named gate — PASSES on the clean tree
node ../vv.mjs prove    # seeds a TODO, the guard goes RED, then restores the file

# now break it for real and watch the gate catch it:
echo "// TODO: ship this" >> src/index.js
node ../vv.mjs run      # FAILS — the gate went red
git checkout -- src/index.js
```

The point of `prove`: a guard that has never failed proves nothing. The mutation record is
the proof that `no-todo` catches the exact fault it claims to catch.
