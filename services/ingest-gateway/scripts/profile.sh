#!/bin/sh
set -eu

output_dir="${1:-profiles}"
mkdir -p "$output_dir"

go test ./internal/spool \
  -run '^$' \
  -bench 'Benchmark(Durable|Duplicate)Enqueue$' \
  -benchmem \
  -count 5 \
  -cpuprofile "$output_dir/cpu.pprof" \
  -memprofile "$output_dir/heap.pprof" \
  | tee "$output_dir/benchmark.txt"

echo "Profiles written to $output_dir"
