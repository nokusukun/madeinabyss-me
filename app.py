from flask import Flask, render_template, send_from_directory, abort, request, session, redirect, send_file, url_for, jsonify
import flask
import json
import os
import random
import glob
import yaml
from natsort import natsorted, ns
import waitress
from jsmin import jsmin

app = Flask(__name__, static_url_path='')

chapter_files = glob.glob("chapters/*")
chapter_files = natsorted(chapter_files, alg=ns.REAL)
manga_chapters = {}
for chapter in chapter_files:
    with open(chapter) as f:
        data = yaml.load(f.read())
        manga_chapters[str(data["chapter"])] = data


@app.route("/")
def index():
    return send_from_directory('templates', "index.html")

#@app.route("/reader")
def old_reader():
    return redirect(url_for('reader'))

@app.route("/reader")
def reader():
    return send_from_directory("templates", "reader.html")


@app.route("/m")
def reader2():
    chapter = manga_chapters[request.args.get('chapter')]
    page = request.args.get('page', 1)
    title = f'{chapter["title"]} - {chapter["chapter"]}'
    return render_template("m.html", title=title, image=chapter["pages"][int(page) - 1]["link"])
    #return send_from_directory("templates", "reader.html")


@app.route("/src/<file>")
def sendImage(file):
    if not os.path.isfile("templates/"+file):
        abort(404)
    return send_from_directory('templates', file)


@app.route("/favicon.ico")
def sendfavico():
    return send_from_directory('templates', "favico.ico")


@app.route("/src/core/<file>")
def sendCore(file):
    if not os.path.isfile("templates/core/"+file):
        abort(404)
    return send_from_directory('templates/core', file)

@app.route("/robots.txt")
def sendRobots():
    return send_from_directory('templates', "robots.txt")

@app.route("/chapters")
def sendChapters():
    def iconify(link):
        elem = link.split(".")
        a = ".".join(elem[0:-1])
        a += "l." + elem[-1]
        return a

    chapters = [{"cover": iconify(x["pages"][0]["link"]), "lang": x.get("language", "en"), "chapter": x["chapter"], "volume": x["volume" ], "title": x.get("title", "")} for x in manga_chapters.values()]
    chapters.reverse()
    return jsonify(chapters)

@app.route("/get/<chapter>")
def getChapter(chapter):
    print(manga_chapters.keys())
    data = manga_chapters[chapter]
    _curr = list(manga_chapters.keys()).index(chapter)
    try:
        next_chapter = list(manga_chapters.keys())[_curr + 1]
    except:
        next_chapter = 0
    data["next_chapter"] = next_chapter

    try:
        prev_chapter = list(manga_chapters.keys())[_curr - 1]
    except:
        prev_chapter = 0
    data["prev_chapter"] = prev_chapter



    data["pages"] = [{"link": x["link"]} for x in data["pages"]]
    print(f"Serving Chapter {chapter}")
    return jsonify(data)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 1122))
    waitress.serve(app, port=port)
    #app.run(host='0.0.0.0', port=port)