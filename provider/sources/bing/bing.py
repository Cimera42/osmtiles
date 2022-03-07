import os

def run():
    path_dir = os.path.dirname(__file__)
    with open(f'{path_dir}/bing.conf') as file_:
        with open(f'{path_dir}/bing.js') as jsfile_:
            return [file_.read(), jsfile_.read()]
