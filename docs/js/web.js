import { hide, reveal } from "./api.js";
const $ = (id) => document.getElementById(id);
$("enc").onclick = () => {
    try {
        $("recipe").value = hide($("msg").value, $("lang").value);
    }
    catch (e) {
        $("recipe").value = "! " + e.message;
    }
};
$("dec").onclick = () => {
    try {
        $("out").value = reveal($("recipe").value);
    }
    catch (e) {
        $("out").value = "! " + e.message;
    }
};
