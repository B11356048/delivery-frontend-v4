const API = "https://delivery-backend-v4.onrender.com";

let currentUser = null;
let cart = [];

/* =====================
   初始化
===================== */

window.onload = () => {

    const user =
    localStorage.getItem("user");

    if(user){

        currentUser =
        JSON.parse(user);

        showRolePage();

    }

};

/* =====================
   註冊
===================== */

async function registerUser(){

    try{

        const body = {

            role:
            document.getElementById("regRole").value,

            username:
            document.getElementById("regUser").value,

            password:
            document.getElementById("regPass").value,

            name:
            document.getElementById("regName").value,

            phone:
            document.getElementById("regPhone").value

        };

        const res =
        await fetch(
            API + "/api/register",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify(body)
            }
        );

        const data =
        await res.json();

        alert(data.message);

    }
    catch(err){

        alert(err.message);

    }

}

/* =====================
   登入
===================== */

async function login(){

    try{

        const res =
        await fetch(
            API + "/api/login",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({

                    username:
                    document.getElementById("loginUser").value,

                    password:
                    document.getElementById("loginPass").value

                })
            }
        );

        const data =
        await res.json();

        if(!data.success){

            alert(data.message);
            return;

        }

        currentUser =
        data.user;

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        showRolePage();

    }
    catch(err){

        alert(err.message);

    }

}

/* =====================
   登出
===================== */

function logout(){

    localStorage.removeItem("user");

    currentUser = null;

    location.reload();

}

/* =====================
   角色頁面
===================== */

function showRolePage(){

    document
    .getElementById("auth")
    .style.display = "none";

    if(currentUser.role === "customer"){

        document
        .getElementById("customer")
        .style.display = "block";

        loadFoods();
        loadMyOrders();

    }

    if(currentUser.role === "merchant"){

        document
        .getElementById("merchant")
        .style.display = "block";

        loadMerchantFoods();
        loadMerchantOrders();

    }

    if(currentUser.role === "rider"){

        document
        .getElementById("rider")
        .style.display = "block";

        loadAvailableOrders();

    }

}

/* =====================
   商品
===================== */

async function loadFoods(){

    const res =
    await fetch(
        API + "/api/foods"
    );

    const data =
    await res.json();

    const foods =
    document.getElementById("foods");

    foods.innerHTML = "";

    data.data.forEach(food=>{

        const avg =
        (
            food.ratingSum /
            food.ratingCount
        ).toFixed(1);

        foods.innerHTML += `

        <div class="food-card">

            <img src="${food.image || ''}">

            <h3>${food.name}</h3>

            <p>$${food.price}</p>

            <p>庫存：${food.stock}</p>

            <p>⭐ ${avg}</p>

            <button
            onclick="addToCart('${food._id}')">
            加入購物車
            </button>

        </div>

        `;

    });

}

/* =====================
   加入購物車
===================== */

async function addToCart(foodId){

    const res =
    await fetch(
        API + "/api/foods"
    );

    const data =
    await res.json();

    const food =
    data.data.find(
        f => f._id === foodId
    );

    const existing =
    cart.find(
        c => c.foodId === foodId
    );

    if(existing){

        existing.qty++;

    }
    else{

        cart.push({

            foodId:food._id,

            name:food.name,

            price:food.price,

            qty:1,

            image:food.image

        });

    }

    renderCart();

}

/* =====================
   顯示購物車
===================== */

function renderCart(){

    const cartDiv =
    document.getElementById("cart");

    if(!cartDiv) return;

    let html = "";

    let total = 0;

    cart.forEach(item=>{

        total +=
        item.price *
        item.qty;

        html += `

        <div>

            ${item.name}

            x ${item.qty}

            = $

            ${item.price * item.qty}

        </div>

        `;

    });

    html += `

    <h3>
    總金額：
    ${total}
    </h3>

    `;

    cartDiv.innerHTML =
    html;

}

/* =====================
   我的訂單
===================== */

async function loadMyOrders(){

    if(!currentUser) return;

    const res =
    await fetch(

        API +

        "/api/orders/user/" +

        currentUser._id

    );

    const data =
    await res.json();

    console.log(
        "我的訂單",
        data
    );

}

/* =====================
   店家商品
===================== */

async function loadMerchantFoods(){

    const res =
    await fetch(

        API +

        "/api/foods/store/" +

        currentUser._id

    );

    const data =
    await res.json();

    console.log(
        data
    );

}

/* =====================
   店家訂單
===================== */

async function loadMerchantOrders(){

    const res =
    await fetch(

        API +

        "/api/orders/store/" +

        currentUser._id

    );

    const data =
    await res.json();

    console.log(
        data
    );

}

/* =====================
   騎手待接單
===================== */

async function loadAvailableOrders(){

    const res =
    await fetch(

        API +

        "/api/orders/available"

    );

    const data =
    await res.json();

    console.log(
        data
    );

}
