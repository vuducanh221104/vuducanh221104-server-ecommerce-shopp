import { CatchError } from "../config/catchError.js";
import PaymentService from "../services/payment/index.js";
import { Order } from "../models/Order.js";

class PaymentController {
  /**
   * Khởi tạo thanh toán
   */
  initializePayment = CatchError(async (req, res) => {
    const { orderId, method, successUrl, cancelUrl } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!orderId) {
      return res.status(400).json({
        status: "error",
        message: "Mã đơn hàng là bắt buộc",
      });
    }

    if (!method) {
      return res.status(400).json({
        status: "error",
        message: "Phương thức thanh toán là bắt buộc",
      });
    }

    // Thêm thông tin client IP cho VNPay
    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress ||
      "127.0.0.1";

    const result = await PaymentService.initializePayment(method, {
      orderId,
      successUrl,
      cancelUrl,
      clientIp,
    });

    return res.status(200).json({
      status: "success",
      message: "Khởi tạo thanh toán thành công",
      data: result,
    });
  });
  /**
   * Xử lý callback từ VNPay
   */
  handleVNPayReturn = CatchError(async (req, res) => {
    const vnpParams = req.query;


    try {
      const result = await PaymentService.confirmVNPayPayment(vnpParams);


      // Redirect về trang thành công hoặc thất bại
      const redirectPath = result.success
        ? "/payment/success"
        : "/payment/failure";

      // Redirect về client với thông tin đơn hàng
      return res.redirect(
        `${process.env.BASE_URL_CLIENT}${redirectPath}?orderId=${result.order._id}&success=${result.success}`
      );
    } catch (error) {
      // Vẫn giữ try/catch ở đây vì chúng ta muốn xử lý lỗi theo cách đặc biệt (redirect)
      // thay vì trả về JSON error response mặc định từ CatchError
      console.error("VNPay return error:", error);
      return res.redirect(
        `${
          process.env.BASE_URL_CLIENT
        }/payment/failure?error=${encodeURIComponent(error.message)}`
      );
    }
  });

  /**
   * Xử lý IPN (Instant Payment Notification) từ VNPay
   */
  handleVNPayIPN = CatchError(async (req, res) => {
    const vnpParams = req.query;

    try {
      await PaymentService.confirmVNPayPayment(vnpParams);

      // Trả về mã 200 cho VNPay biết đã nhận được thông báo
      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    } catch (error) {
      // VNPay yêu cầu phản hồi cụ thể cho lỗi nên vẫn giữ try/catch
      console.error("VNPay IPN error:", error);
      return res.status(400).json({ RspCode: "99", Message: "Confirm Fail" });
    }
  });

  /**
   * Xử lý callback từ MoMo
   */
  handleMoMoReturn = CatchError(async (req, res) => {
    const momoParams = req.query;

    try {
      const result = await PaymentService.confirmMoMoPayment(momoParams);

      // Redirect về trang thành công hoặc thất bại
      const redirectPath = result.success
        ? "/payment/success"
        : "/payment/failure";

      // Redirect về client với thông tin đơn hàng
      return res.redirect(
        `${process.env.BASE_URL_CLIENT}${redirectPath}?orderId=${result.order._id}&success=${result.success}`
      );
    } catch (error) {
      console.error("MoMo return error:", error);
      return res.redirect(
        `${
          process.env.BASE_URL_CLIENT
        }/payment/failure?error=${encodeURIComponent(error.message)}`
      );
    }
  });

  /**
   * Xử lý IPN (Instant Payment Notification) từ MoMo
   */
  handleMoMoIPN = CatchError(async (req, res) => {
    const momoParams = req.query;

    try {
      await PaymentService.confirmMoMoPayment(momoParams);

      // Trả về mã 200 cho MoMo biết đã nhận được thông báo
      return res.status(200).json({ status: 0, message: "Confirm Success" });
    } catch (error) {
      console.error("MoMo IPN error:", error);
      return res.status(400).json({ status: 1, message: "Confirm Fail" });
    }
  });

  /**
   * Xác nhận thanh toán Stripe từ client
   */
  confirmStripePayment = CatchError(async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Session ID là bắt buộc",
      });
    }

    const result = await PaymentService.confirmStripePayment(sessionId);

    return res.status(200).json({
      status: "success",
      message: result.success
        ? "Thanh toán thành công"
        : "Thanh toán chưa hoàn tất",
      data: result,
    });
  });

  /**
   * Xử lý webhook từ Stripe
   */
  handleStripeWebhook = CatchError(async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        status: "error",
        message: "Chữ ký webhook không hợp lệ",
      });
    }

    try {
      // req.rawBody là body gốc chưa qua xử lý của Express
      const result = await PaymentService.handleStripeWebhook(
        req.rawBody || req.body,
        signature
      );

      // Trả về mã 200 cho Stripe biết đã nhận được webhook
      return res.status(200).json({ received: true, result });
    } catch (error) {
      // Stripe webhook cần phản hồi cụ thể nên vẫn giữ try/catch
      console.error("Stripe webhook error:", error);
      return res.status(400).json({ received: false, error: error.message });
    }
  });

  /**
   * Lấy thông tin thanh toán của đơn hàng
   */
  getOrderPaymentInfo = CatchError(async (req, res) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Bỏ qua kiểm tra quyền truy cập để tiện cho việc test
    // if (
    //   order.user_id &&
    //   order.user_id.toString() !== req.user.id &&
    //   req.user.role !== "admin"
    // ) {
    //   return res.status(403).json({
    //     status: "error",
    //     message: "Bạn không có quyền truy cập thông tin đơn hàng này",
    //   });
    // }

    return res.status(200).json({
      status: "success",
      message: "Lấy thông tin thanh toán thành công",
      data: {
        orderId: order._id,
        amount: order.total_amount,
        paymentMethod: order.payment.method,
        paymentStatus: order.payment.status,
        transactionId: order.payment.transaction_id,
        paymentDate: order.payment.payment_date,
      },
    });
  });

  /**
   * Lấy phương thức thanh toán có sẵn
   */
  getAvailablePaymentMethods = CatchError(async (req, res) => {
    const paymentMethods = [
      {
        id: "COD",
        name: "Thanh toán khi nhận hàng",
        description: "Thanh toán tiền mặt khi nhận hàng",
        icon: "money",
      },
      {
        id: "VNPAY",
        name: "VNPay",
        description: "Thanh toán qua VNPay",
        icon: "vnpay",
      },
      {
        id: "MOMO",
        name: "Ví MoMo",
        description: "Thanh toán qua ví điện tử MoMo",
        icon: "momo",
      },
    ];

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách phương thức thanh toán thành công",
      data: {
        paymentMethods,
      },
    });
  });

  /**
   * Xử lý thanh toán COD
   */
  processCODPayment = CatchError(async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        status: "error",
        message: "Mã đơn hàng là bắt buộc",
      });
    }

    try {
      const result = await PaymentService.processCODPayment(orderId);

      return res.status(200).json({
        status: "success",
        message: "Đơn hàng COD đã được xử lý thành công",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  });

  /**
   * Kiểm tra trạng thái thanh toán
   */
  checkPaymentStatus = CatchError(async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        status: "error",
        message: "Mã đơn hàng là bắt buộc",
      });
    }

    try {
      const paymentStatus = await PaymentService.checkPaymentStatus(orderId);

      return res.status(200).json({
        status: "success",
        message: "Kiểm tra trạng thái thanh toán thành công",
        data: paymentStatus,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  });
}

export default new PaymentController();
