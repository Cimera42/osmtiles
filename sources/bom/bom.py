import requests
from jinja2 import Template
import os

def run():
    page = requests.get('https://api.weather.bom.gov.au/v1/rainradarlayer/capabilities')
    content = page.json()

    timestamp = max(content['data']['timesteps'])

    path_dir = os.path.dirname(__file__)
    with open(f'{path_dir}/bom.conf.jinja2') as file_:
        template = Template(file_.read())

    output = template.render(timestamp=timestamp)

    return output
