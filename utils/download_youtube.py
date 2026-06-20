"""Download one YouTube video as an MP4 using Python, not a shell command.

Install the dependency once with:
    .venv/bin/python -m pip install yt-dlp
"""

from pathlib import Path


def download_youtube_mp4(url: str, output_dir: str | Path = "downloads") -> Path:
    """Download *url* at the best available MP4-compatible quality."""
    try:
        import yt_dlp
    except ImportError as error:
        raise RuntimeError(
            "Missing dependency: install yt-dlp in your Python environment."
        ) from error

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    options = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": str(output_path / "%(title).180B [%(id)s].%(ext)s"),
        "merge_output_format": "mp4",
        "noplaylist": True,
        "restrictfilenames": True,
    }

    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=True)
        saved_file = Path(downloader.prepare_filename(info))

    # prepare_filename may retain a pre-merge extension; return the actual MP4
    # when yt-dlp merged separate audio/video streams.
    mp4_file = saved_file.with_suffix(".mp4")
    return mp4_file if mp4_file.exists() else saved_file


if __name__ == "__main__":
    #url = "https://www.youtube.com/watch?v=XFNqN0q_i2A"
    #url =  "https://www.youtube.com/watch?v=ojGj7Hpa-OQ"
    url="https://www.youtube.com/watch?v=8XBDBM6lsuE"

    downloaded_file = download_youtube_mp4(url)
    print(f"Saved: {downloaded_file.resolve()}")
