import os,pathlib,shutil,subprocess,sys
shutil.copytree('/workspace','/tmp/candidate')
os.chdir('/tmp/candidate')
pathlib.Path('node_modules').symlink_to('/trusted/app/node_modules',target_is_directory=True)
# All values are disposable fixtures. The verifier receives no hosted secrets.
env={'PATH':os.environ['PATH'],'HOME':'/tmp','PYTHONDONTWRITEBYTECODE':'1','NEXT_TELEMETRY_DISABLED':'1','NODE_OPTIONS':'--max-old-space-size=1536',
     'NEXT_PUBLIC_SUPABASE_URL':'https://isolated-fixture.supabase.co','NEXT_PUBLIC_SUPABASE_ANON_KEY':'fixture-public-key'}
raise SystemExit(subprocess.run(sys.argv[1:],env=env).returncode)
