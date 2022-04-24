def build(filename, dependencies, output):
    dependencies.add(filename)

    with open(filename, "r") as f:
        for line in f.readlines():
            if line.startswith("//#include"):
                include_filename = line.split("(\"", 1)[1].split("\")", 1)[0]

                build(include_filename, dependencies, output)

            elif (index := line.find("#include")) != -1:
                prefix = line[:index]
                rest = line[index:]
                include_filename, suffix = rest.split("(\"", 1)[1].split("\")", 1)

                output.append(prefix)
                build(include_filename, dependencies, output)
                output.append(suffix)

            else:
                output.append(line)

def watch(dependencies):
    import os
    import time
    
    timestamps = [os.stat(d).st_mtime for d in dependencies]

    while True:
        time.sleep(1)

        for d, ts in zip(dependencies, timestamps):
            if os.stat(d).st_mtime != ts:
                return

if __name__ == "__main__":
    import subprocess

    WATCH = "src/index.ts"
    OUT = "build/index.ts"

    while True:
        dependencies = set()
        lines = []
        build(WATCH, dependencies, lines)

        with open(OUT, "w") as f:
            for line in lines:
                f.write(line)

        # TODO run tsc
        cmd = [
            "tsc", "--outFile", "js/index.js", "build/index.ts"
        ]
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

        watch(dependencies)