import os
from sources.bom.bom import run as run_bom
from sources.strava.strava import run as run_strava
from sources.dcsnsw.dcsnsw import run as run_dcsnsw
from jinja2 import Template

sources = {
    'bom': run_bom(),
    # 'strava': run_strava(),
    'dcsnsw': run_dcsnsw(),
}

dir_path = os.path.dirname(__file__)
output_folder = f'{dir_path}/output'
os.makedirs(output_folder, exist_ok=True)

with open(f'{dir_path}/osmtiles.conf.jinja2') as file_:
    template = Template(file_.read())

output = template.render(
    sources=[conf for key, conf in sources.items()],
)

filename = f'{output_folder}/osmtiles.conf'
with open(filename, 'w') as file_:
    file_.write(output)
