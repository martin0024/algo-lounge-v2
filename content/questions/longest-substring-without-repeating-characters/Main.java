import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        String s = in.get(0).getAsString();

        int result = new Solution().lengthOfLongestSubstring(s);
        System.out.println(new Gson().toJson(result));
    }
}
