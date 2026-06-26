import { hide, reveal } from "./api.js";
import { Lang } from "./recipe.js";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement & HTMLTextAreaElement;

$("enc").onclick = () => {
  try { $("recipe").value = hide($("msg").value, $("lang").value as Lang); }
  catch (e) { $("recipe").value = "! " + (e as Error).message; }
};

$("dec").onclick = () => {
  try { $("out").value = reveal($("recipe").value); }
  catch (e) { $("out").value = "! " + (e as Error).message; }
};
