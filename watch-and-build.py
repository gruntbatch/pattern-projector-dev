import os
import subprocess
import time


def _build(infile, dependencies, lines):
    dependencies.add(infile)

    with open(infile, "r") as f:
        for line in f.readlines():
            if line.startswith("//#include"):
                filename = line.split("(\"", 1)[1].split("\")", 1)[0]
                _build(filename, dependencies, lines)
            
            elif (index := line.find("#include")) != -1:
                prefix = line[:index]
                filename, suffix = line[index:].split("(\"", 1)[1].split("\")", 1)

                lines.append(prefix)
                _build(filename, dependencies, lines)
                lines.append(suffix)

            else:
                lines.append(line)



def build(infile, outfile):
    dependencies = set()
    lines = []
    _build(infile, dependencies, lines)

    with open(outfile, "w") as f:
        for line in lines:
            f.write(line)

    return dependencies


def watch(dependencies):
    dts = {d: os.stat(d).st_mtime for d in dependencies}

    while True:
        time.sleep(1)

        # TODO Handle file deletion
        for d, ts in dts.items():
            if os.stat(d).st_mtime != ts:
                return
                    


def watch_and_build(builddir, outfile, infiles):
    while True:
        # Build
        dependencies = set()
        tsc_infiles = set()
        for infile in infiles:
            _outfile = os.path.join(builddir, os.path.basename(infile))
            tsc_infiles.add(_outfile)

            infile_dependencies = build(infile, _outfile)

            for infile_dependency in infile_dependencies:
                dependencies.add(infile_dependency)

        cmd = [
            "tsc", "--outFile", outfile, *tsc_infiles
        ]

        # Compile
        print()
        print("Building ...")
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
            print("... Done! Watching these files for changes:")
            for d in dependencies:
                print("\t", d, sep="")

        # Watch        
        watch(dependencies)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--builddir", type=str)
    parser.add_argument("--outfile", type=str)
    parser.add_argument("infiles", nargs="+")
    args = parser.parse_args()

    builddir = args.builddir
    outfile = args.outfile
    infiles = args.infiles

    watch_and_build(builddir, outfile, infiles)