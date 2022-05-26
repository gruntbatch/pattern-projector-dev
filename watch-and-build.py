import glob
import itertools
import os
import subprocess
import time


def scan_for_source_files(sourcedirs: set[str]):
    sources = set()
    for sourcedir in sourcedirs:
        sources |= set(glob.glob(os.path.join(sourcedir, "*.ts")))
    return sources


def watch_for_source_files(sourcedirs, dependencies: set[str]):
    sources = scan_for_source_files(sourcedirs)
    files_of_interest = sources | dependencies
    foi2ts = {foi: os.stat(foi).st_mtime for foi in files_of_interest}

    while True:
        time.sleep(1)

        sources2 = scan_for_source_files(sourcedirs)
        if sources != sources2:
            return sources2

        for foi, ts in foi2ts.items():
            try:
                if os.stat(foi).st_mtime != ts:
                    return sources2
            except FileNotFoundError:
                return sources2



def preprocess_and_compile(sources, builddir, outfile):
    dependencies = set()
    processed_sources = set()
    preprocess(sources, builddir, dependencies, processed_sources)
    compile(processed_sources, outfile)
    return dependencies


def preprocess(sources, builddir, out_dependencies, out_sources):
    for source in sources:
        lines = []
        _preprocess(source, out_dependencies, lines)

        out_source = os.path.join(builddir, os.path.basename(source))
        with open(out_source, "w") as f:
            for line in lines:
                f.write(line)

        out_sources.add(out_source)


def _preprocess(source, out_dependencies, out_lines):
    out_dependencies.add(source)

    with open(source, "r") as f:
        for line in f.readlines():
            if line.startswith("//#include") or line.startswith("// #include"):
                source2 = line.split("(\"", 1)[1].split("\")", 1)[0]
                _preprocess(source2, out_dependencies, out_lines)

            elif (index := line.find("#include")) != -1:
                prefix = line[:index]
                source2, suffix = line[index:].split("(\"", 1)[1].split("\")", 1)

                out_lines.append(prefix)
                _preprocess(source2, out_dependencies, out_lines)
                out_lines.append(suffix)

            else:
                out_lines.append(line)


def compile(sources, outfile):
    cmd = [
        "tsc", "--module", "none", "--outFile", outfile, *sources
    ]

    print()
    print("Compiling ...")
    print()
    print(*cmd)
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE
    )
    print(result.stdout.decode("utf-8"))

    if result.returncode != 0:
        print("... Done! Errors detected!")

    else:
        print("... Done!")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--builddir", type=str)
    parser.add_argument("--outfile", type=str)
    parser.add_argument("--sourcedir", type=str, dest="sourcedirs", action="append")
    args = parser.parse_args()

    # scan sourcedirs for additional source files
    sources = scan_for_source_files(set(args.sourcedirs))

    # preprocess and compile files
    dependencies = preprocess_and_compile(sources, args.builddir, args.outfile)

    while True:
        # watch for new or changed sources
        sources = watch_for_source_files(args.sourcedirs, dependencies)

        # preprocess and compile files
        dependencies = preprocess_and_compile(sources, args.builddir, args.outfile)
