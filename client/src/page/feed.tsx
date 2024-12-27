import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import ReactModal from "react-modal";
import Popup from "reactjs-popup";
import { Link, useLocation } from "wouter";
import { useAlert, useConfirm } from "../components/dialog";
import { HashTag } from "../components/hashtag";
import { Waiting } from "../components/loading";
import { Markdown } from "../components/markdown";
import { client } from "../main";
import { ClientConfigContext } from "../state/config";
import { ProfileContext } from "../state/profile";
import { headersWithAuth } from "../utils/auth";
import { siteName } from "../utils/constants";
import { timeago } from "../utils/timeago";
import { Button } from "../components/ui/button";
import { Tips } from "../components/tips";
import { useLoginModal } from "../hooks/useLoginModal";
import {Input} from "../components/ui/input";

type Feed = {
  id: number;
  title: string | null;
  content: string;
  uid: number;
  createdAt: Date;
  updatedAt: Date;
  hashtags: {
    id: number;
    name: string;
  }[];
  user: {
    avatar: string | null;
    id: number;
    username: string;
  };
  pv: number;
  uv: number;
};

export function FeedPage({ id, TOC, clean }: { id: string, TOC: () => JSX.Element, clean: (id: string) => void }) {
  const { t } = useTranslation();
  const profile = useContext(ProfileContext);
  const [feed, setFeed] = useState<Feed>();
  const [error, setError] = useState<string>();
  const [headImage, setHeadImage] = useState<string>();
  const ref = useRef("");
  const [_, setLocation] = useLocation();
  const { showAlert, AlertUI } = useAlert();
  const { showConfirm, ConfirmUI } = useConfirm();
  const [top, setTop] = useState<number>(0);
  const config = useContext(ClientConfigContext);
  const counterEnabled = config.get<boolean>('counter.enabled');
  function deleteFeed() {
    // Confirm
    showConfirm(
      t("article.delete.title"),
      t("article.delete.confirm"),
      () => {
        if (!feed) return;
        client
          .feed({ id: feed.id })
          .delete(null, {
            headers: headersWithAuth(),
          })
          .then(({ error }) => {
            if (error) {
              showAlert(error.value as string);
            } else {
              showAlert(t("delete.success"));
              setLocation("/");
            }
          });
      })
  }
  function topFeed() {
    const isUnTop = !(top > 0)
    const topNew = isUnTop ? 1 : 0;
    // Confirm
    showConfirm(
      isUnTop ? t("article.top.title") : t("article.untop.title"),
      isUnTop ? t("article.top.confirm") : t("article.untop.confirm"),
      () => {
        if (!feed) return;
        client
          .feed.top({ id: feed.id })
          .post({
            top: topNew,
          }, {
            headers: headersWithAuth(),
          })
          .then(({ error }) => {
            if (error) {
              showAlert(error.value as string);
            } else {
              showAlert(isUnTop ? t("article.top.success") : t("article.untop.success"));
              setTop(topNew);
            }
          });
      })
  }
  useEffect(() => {
    if (ref.current == id) return;
    setFeed(undefined);
    setError(undefined);
    setHeadImage(undefined);
    client
      .feed({ id })
      .get({
        headers: headersWithAuth(),
      })
      .then(({ data, error }) => {
        if (error) {
          setError(error.value as string);
        } else if (data && typeof data !== "string") {
          setTimeout(() => {
            setFeed(data);
            setTop(data.top);
            // Extract head image
            const img_reg = /!\[.*?\]\((.*?)\)/;
            const img_match = img_reg.exec(data.content);
            if (img_match) {
              setHeadImage(img_match[1]);
            }
            clean(id);
          }, 0);
        }
      });
    ref.current = id;
  }, [id]);
  return (
    <Waiting for={feed || error}>
      {feed && (
        <Helmet>
          <title>{`${feed.title ?? "Unnamed"} - ${process.env.NAME}`}</title>
          <meta property="og:site_name" content={siteName} />
          <meta property="og:title" content={feed.title ?? ""} />
          <meta property="og:image" content={headImage ?? process.env.AVATAR} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={document.URL} />
          <meta
            name="og:description"
            content={
              feed.content.length > 200
                ? feed.content.substring(0, 200)
                : feed.content
            }
          />
          <meta name="author" content={feed.user.username} />
          <meta
            name="keywords"
            content={feed.hashtags.map(({ name }) => name).join(", ")}
          />
          <meta
            name="description"
            content={
              feed.content.length > 200
                ? feed.content.substring(0, 200)
                : feed.content
            }
          />
        </Helmet>
      )}
      <div className="w-full flex flex-row justify-center ani-show dark:text-white">
        {error && (
          <>
            <div className="flex flex-col wauto rounded-2xl m-2 p-6 items-center justify-center space-y-2 dark:text-white">
              <h1 className="text-xl font-bold t-primary">{error}</h1>
              {error === "Not found" && id === "about" && (
                <Tips value={t("about.notfound")} />
              )}
              <Button
                className="dark:text-white"
                onClick={() => (window.location.href = "/")}
              >
                {t("index.back")}
              </Button>
            </div>
          </>
        )}
        {feed && !error && (
          <>
            <div className="xl:w-64" />
            <main className="w-full">
              <article
                className="rounded-2xl m-2 px-6 py-4"
                aria-label={feed.title ?? "Unnamed"}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="mt-1 mb-1 flex gap-1">
                      <p
                        className="text-gray-400 text-[12px]"
                        title={new Date(feed.createdAt).toLocaleString()}
                      >
                        {t("feed_card.published$time", {
                          time: timeago(feed.createdAt),
                        })}
                      </p>

                      {feed.createdAt !== feed.updatedAt && (
                        <p
                          className="text-gray-400 text-[12px]"
                          title={new Date(feed.updatedAt).toLocaleString()}
                        >
                          {t("feed_card.updated$time", {
                            time: timeago(feed.updatedAt),
                          })}
                        </p>
                      )}
                    </div>
                    {counterEnabled && <p className='text-[12px] text-gray-400 font-normal link-line'>
                      <span> {t("count.pv")} </span>
                      <span>
                        {feed.pv}
                      </span>
                      <span> |</span>
                      <span> {t("count.uv")} </span>
                      <span>
                        {feed.uv}
                      </span>
                    </p>}
                    <div className="flex flex-row items-center">
                      <h1 className="text-2xl font-bold t-primary break-all">
                        {feed.title}
                      </h1>
                      <div className="flex-1 w-0" />
                    </div>
                  </div>
                  <div className="pt-2">
                    {profile?.permission && (
                      <div className="flex gap-2">
                        <Button
                          aria-label={top > 0 ? t("untop.title") : t("top.title")}
                          onClick={topFeed}
                          className={`flex-1 flex flex-col items-end justify-center px-2 py rounded-full transition ${top > 0 ? " text-white hover:-hover active:-active" : "dark:text-neutral-400"}`}
                        >
                          <i className="ri-skip-up-line" />
                        </Button>
                        <Link
                          aria-label={t("edit")}
                          href={`/writing/${feed.id}`}
                          className="flex-1 flex flex-col items-end justify-center px-2 py bg-secondary bg-Button rounded-full transition"
                        >
                          <i className="ri-edit-2-line dark:text-neutral-400" />
                        </Link>
                        <Button
                          aria-label={t("delete.title")}
                          onClick={deleteFeed}
                          className="flex-1 flex flex-col items-end justify-center px-2 py bg-secondary bg-Button rounded-full transition"
                        >
                          <i className="ri-delete-bin-7-line text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <Markdown content={feed.content} />
                <div className="mt-6 flex flex-col gap-2">
                  {feed.hashtags.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-x-2">
                      {feed.hashtags.map(({ name }, index) => (
                        <HashTag key={index} name={name} />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-row items-center">
                    <img
                      src={feed.user.avatar || "/avatar.png"}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="ml-2">
                      <span className="text-sm cursor-default">
                        {feed.user.username}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
              {feed && <Comments id={`${feed.id}`} />}
              <div className="h-16" />
            </main>
            <div className="w-80 hidden lg:block relative">
              <div
                className={`ml-2 rounded-2xl bg-w py-4 px-4 start-0 end-0 top-[5.5rem] sticky t-primary`}
              >
                <TOC />
              </div>
            </div>
          </>
        )}
      </div>
      <AlertUI />
      <ConfirmUI />
    </Waiting>
  );
}

export function TOCHeader({ TOC }: { TOC: () => JSX.Element }) {
  const [isOpened, setIsOpened] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        onClick={() => setIsOpened(true)}
        className="w-10 h-10 rounded-full flex flex-row items-center justify-center"
      >
        <i className="ri-menu-2-fill t-primary ri-lg"></i>
      </Button>
      <ReactModal
        isOpen={isOpened}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            padding: "0",
            border: "none",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "none",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          },
        }}
        onRequestClose={() => setIsOpened(false)}
      >
        <div className="rounded-2xl bg-w py-4 px-4 w-[80vw] sm:w-[60vw] lg:w-[40vw] overflow-clip relative t-primary">
          <TOC />
        </div>
      </ReactModal>
    </div>
  );
}

function CommentInput({
  id,
  onRefresh,
}: {
  id: string;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const { showAlert, AlertUI } = useAlert();
  const profile = useContext(ProfileContext);
  const { LoginModal, setIsOpened } = useLoginModal()
  function errorHumanize(error: string) {
    if (error === "Unauthorized") return t("login.required");
    else if (error === "Content is required") return t("comment.empty");
    return error;
  }
  function submit() {
    if (!profile) {
      setIsOpened(true)
      return;
    }
    client.feed
      .comment({ feed: id })
      .post(
        { content },
        {
          headers: headersWithAuth(),
        }
      )
      .then(({ error }) => {
        if (error) {
          setError(errorHumanize(error.value as string));
        } else {
          setContent("");
          setError("");
          showAlert(t("comment.success"), () => {
            onRefresh();
          });
        }
      });
  }
  return (
    <div className="w-full rounded-2xl bg-w t-primary m-2 p-6 items-end flex flex-col">
      <div className="flex flex-col w-full items-start mb-4">
        <label htmlFor="comment">{t("comment.title")}</label>
      </div>
      {profile ? (<>
        <Input
          type={"textarea"}
          id="comment"
          placeholder={t("comment.placeholder.title")}
          className="bg-w w-full h-24 rounded-lg"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          className="mt-4 text-white px-4 py-2 rounded-full"
          onClick={submit}
        >
          {t("comment.submit")}
        </Button>
      </>) : (
        <div className="flex flex-row w-full items-center justify-center space-x-2 py-12">
          <Button
            className="mt-2  text-white px-4 py-2 rounded-full"
            onClick={() => setIsOpened(true)}
          >
            {t("login.required")}
          </Button>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <AlertUI />
      <LoginModal />
    </div>
  );
}

type Comment = {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    username: string;
    avatar: string | null;
    permission: number | null;
  };
};

function Comments({ id }: { id: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>();
  const ref = useRef("");
  const { t } = useTranslation();

  function loadComments() {
    client.feed
      .comment({ feed: id })
      .get({
        headers: headersWithAuth(),
      })
      .then(({ data, error }) => {
        if (error) {
          setError(error.value as string);
        } else if (data && Array.isArray(data)) {
          setComments(data);
        }
      });
  }
  useEffect(() => {
    if (ref.current == id) return;
    loadComments();
    ref.current = id;
  }, [id]);
  return (
    <>
      <div className="m-2 flex flex-col justify-center items-center">
        <CommentInput id={id} onRefresh={loadComments} />
        {error && (
          <>
            <div className="flex flex-col wauto rounded-2xl bg-w t-primary m-2 p-6 items-center justify-center">
              <h1 className="text-xl font-bold t-primary">{error}</h1>
              <Button
                className="mt-2  text-white px-4 py-2 rounded-full"
                onClick={loadComments}
              >
                {t("reload")}
              </Button>
            </div>
          </>
        )}
        {comments.length > 0 && (
          <div className="w-full">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onRefresh={loadComments}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CommentItem({
  comment,
  onRefresh,
}: {
  comment: Comment;
  onRefresh: () => void;
}) {
  const { showConfirm, ConfirmUI } = useConfirm();
  const { showAlert, AlertUI } = useAlert();
  const { t } = useTranslation();
  const profile = useContext(ProfileContext);
  function deleteComment() {
    showConfirm(
      t("delete.comment.title"),
      t("delete.comment.confirm"),
      async () => {
        client
          .comment({ id: comment.id })
          .delete(null, {
            headers: headersWithAuth(),
          })
          .then(({ error }) => {
            if (error) {
              showAlert(error.value as string);
            } else {
              showAlert(t("delete.success"), () => {
                onRefresh();
              });
            }
          });
      })
  }
  return (
    <div className="flex flex-row items-start rounded-xl mt-2">
      <img
        src={comment.user.avatar || ""}
        className="w-8 h-8 rounded-full mt-4"
      />
      <div className="flex flex-col flex-1 w-0 ml-2 bg-w rounded-xl p-4">
        <div className="flex flex-row">
          <span className="font-bold">
            {comment.user.username}
          </span>
          <div className="flex-1 w-0" />
          <span
            title={new Date(comment.createdAt).toLocaleString()}
            className="text-gray-400 text-sm"
          >
            {timeago(comment.createdAt)}
          </span>
        </div>
        <p className="break-words">{comment.content}</p>
        <div className="flex flex-row justify-end">
          {(profile?.permission || profile?.id == comment.user.id) && (
            <Popup
              arrow={false}
              trigger={
                <Button className="px-2 py bg-secondary rounded-full">
                  <i className="ri-more-fill t-secondary"></i>
                </Button>
              }
              position="left center"
            >
              <div className="flex flex-row self-end mr-2">
                <Button
                  onClick={deleteComment}
                  aria-label={t("delete.comment.title")}
                  className="px-2 py bg-secondary rounded-full"
                >
                  <i className="ri-delete-bin-2-line t-secondary"></i>
                </Button>
              </div>
            </Popup>
          )}
        </div>
      </div>
      <ConfirmUI />
      <AlertUI />
    </div>
  );
}
