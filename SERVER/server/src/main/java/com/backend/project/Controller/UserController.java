package com.backend.project.Controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.beans.factory.annotation.Value;

import com.backend.project.Service.UserService;
import com.backend.project.model.User;

@CrossOrigin(origins = { "*" })
@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String mailFrom;

    // ✅ 登入
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody User user) {
    try {
        User authenticate = userService.authenticate(user.getUsername(), user.getPassword());

        if (authenticate != null) {
            return ResponseEntity.ok("登入成功");
        } else {
            return ResponseEntity.ok("*帳號或密碼錯誤");
        }
    } catch (Exception e) {
        return ResponseEntity.status(500).body("登入失敗: " + e.getMessage());
    }
}

    @PostMapping("/login/sendVerificationCode")
    public ResponseEntity<?> sendVerificationCode(@RequestBody User user) {
        User foundUser = userService.forgotPasswordAuthenticate(user.getUsername(), user.getEmail());
        if (foundUser == null) {
            return ResponseEntity.badRequest().body("帳號或電子郵件錯誤");
        }

        String toEmail = foundUser.getEmail();
        if (toEmail == null || !toEmail.matches("^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,6}$")) {
            return ResponseEntity.badRequest().body("Email 格式錯誤！");
        }

        String code = userService.generateVerificationCode();
        userService.saveVerificationCode(foundUser, code);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            message.setSubject("【智能手術排程管理系統密碼重置驗證碼】");
            message.setText("親愛的使用者您好，\n\n您申請了密碼重置。\n\n您的驗證碼是： " + code +
                    "\n\n請在 5 分鐘內使用此驗證碼完成操作。\n\n若非您本人操作，請忽略此信。\n\n手術排程系統敬上");

            mailSender.send(message);
            return ResponseEntity.ok("驗證碼已發送至您的信箱");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("發送郵件失敗，請稍後再試");
        }
    }

    @PostMapping("/login/verifyCode")
    public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String email = payload.get("email");
        String inputCode = payload.get("verificationCode");

        User authenticate = userService.forgotPasswordAuthenticate(username, email);
        if (authenticate == null) {
            return ResponseEntity.badRequest().body("帳號或電子郵件錯誤");
        }

        if (!userService.verifyCode(authenticate, inputCode)) {
            return ResponseEntity.badRequest().body("驗證碼錯誤或已過期");
        }

        userService.clearVerificationCode(authenticate);
        return ResponseEntity.ok("驗證成功");
    }

    @PostMapping("/login/ForgotPassword")
    public String forgotPassword(@RequestBody User user) {
        User authenticate = userService.forgotPasswordAuthenticate(user.getUsername(), user.getEmail());
        return (authenticate != null) ? "1" : "*帳號或電子郵件錯誤";
    }

    @PutMapping("/login/changePassword/{username}")
    public ResponseEntity<String> changePassword(@PathVariable String username, @RequestBody User user) {
        String result = userService.changePassword(username, user.getPassword());
        if ("Change Password successfully".equals(result)) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(404).body(result);
        }
    }

    @GetMapping("/system/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> users = userService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("獲取使用者列表失敗: " + e.getMessage());
        }
    }

    @GetMapping("/system/user/{username}")
    public User getUser(@PathVariable String username) {
        return userService.getUser(username);
    }

    @PutMapping("/system/user/{username}")
    public ResponseEntity<?> updateUser(@PathVariable String username, @RequestBody User updatedUser) {
        userService.updateUser(username, updatedUser);
        return ResponseEntity.ok("User update successfully");
    }

    @PostMapping("/system/user/add")
    public ResponseEntity<?> addUser(@RequestBody User user) {
        userService.addUser(user);
        return ResponseEntity.ok("User add successfully");
    }

    @PostMapping("/system/users/add")
    public ResponseEntity<?> addUsers(@RequestBody List<User> users) {
        userService.addUsers(users);
        return ResponseEntity.ok("Users add successfully");
    }

    @DeleteMapping("/system/user/delete/{username}")
    public ResponseEntity<?> deleteUser(@PathVariable String username) {
        userService.deleteUser(username);
        return ResponseEntity.ok("User deleted successfully");
    }

    @DeleteMapping("/system/users/delete")
    public ResponseEntity<?> deleteUsers(@RequestBody List<String> usernames) {
        userService.deleteUsers(usernames);
        return ResponseEntity.ok("Users deleted successfully");
    }
}