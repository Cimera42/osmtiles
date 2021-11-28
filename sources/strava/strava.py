import httpx
import os
from lxml import html
from jinja2 import Template

def run():
    session = httpx.Client(http2=True)

    # Get csrf token
    page = session.get('https://www.strava.com/login')

    tree = html.fromstring(page.content)
    csrf_token = tree.xpath('//meta[@name="csrf-token"]/@content')[0]
    csrf_param = tree.xpath('//meta[@name="csrf-param"]/@content')[0]


    # Login and get heatmap cookies
    login = session.post('https://www.strava.com/session', data={
        'utf8': '✓',
        csrf_param: csrf_token,
        'plan': '',
        'email': 'cimera2@gmail.com',
        'password': '6Lr4%R#V!RyVE@M2ge$3',
    }, follow_redirects=True)

    if login.url == 'https://www.strava.com/login':
        raise Exception

    session.get('https://heatmap-external-a.strava.com/auth')

    cookies = session.cookies

    # Add to template
    path_dir = os.path.dirname(__file__)
    with open(f'{path_dir}/strava.conf.jinja2') as file_:
        template = Template(file_.read())

    output = template.render(
        keyPair=cookies['CloudFront-Key-Pair-Id'],
        policy=cookies['CloudFront-Policy'],
        signature=cookies['CloudFront-Signature'],
    )

    return output
