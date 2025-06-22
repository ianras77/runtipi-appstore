# JupyterLab

JupyterLab is the next-generation interface for Project Jupyter.  
It brings together **notebooks, terminals, text editors, data-visualisations and more** inside a single, flexible browser tab.

## Features
* Interactive Python, R, Julia, Bash… in one workspace  
* Drag-and-drop notebook tabs and resizable panes  
* Live data-plotting, rich markdown & LaTeX rendering  
* Hundreds of community extensions for data science and AI  
* Runs in an isolated Docker container managed by Tipi

## Quick start
1. During install you can set an optional *Access Token*; if you skip it Tipi generates a secure random token.  
2. Once the container is healthy, click **Open** — the IDE appears on port **8888** behind Tipi’s proxy.  
3. All work persists in `data/notebooks` on your host (`/home/jovyan/work` in the container).  
4. Need extra Python packages? Open a Terminal and run `pip install <package>`.

## Default credentials
* **User:** `jovyan`  
* **Token/Password:** as provided (or auto-generated, visible in container logs)

---

Maintained by the Jupyter community – see <https://github.com/jupyter/docker-stacks>.

