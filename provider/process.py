import os
import argparse
from sources.bom.bom import run as run_bom
from sources.strava.strava import run as run_strava
from sources.dcsnsw.dcsnsw import run as run_dcsnsw
from sources.osm.osm import run as run_osm
from sources.bing.bing import run as run_bing
from jinja2 import Template


sources = {
    'bom': run_bom,
    'strava': run_strava,
    'dcsnsw': run_dcsnsw,
    'osm': run_osm,
    'bing': run_bing,
}

parser = argparse.ArgumentParser("osmtiles-provider")
parser.add_argument("--single", help="Update the conf for a single source.", type=str, choices=list(sources.keys()), default=None)
args = parser.parse_args()


dir_path = os.path.dirname(os.path.realpath(__file__))
output_folder = f'{dir_path}/../conf-out/osmtiles_include'
os.makedirs(output_folder, exist_ok=True)


source_files = []
for source_name, gen_source_conf in sources.items():
    filename = f'{source_name}.conf'
    source_files.append(filename)

    if args.single is None or args.single == source_name:
        source_conf = gen_source_conf()
        filepath = f'{output_folder}/provider/{filename}'
        with open(filepath, 'w') as file_:
            file_.write(source_conf)


with open(f'{dir_path}/osmtiles_provider.conf.jinja2') as file_:
    template = Template(file_.read())

output = template.render(
    sources=source_files,
)

filename = f'{output_folder}/osmtiles_provider.conf'
with open(filename, 'w') as file_:
    file_.write(output)
