import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jn = in.get(0).getAsJsonArray();
        int[] numbers = new int[jn.size()];
        for (int i = 0; i < jn.size(); i++) numbers[i] = jn.get(i).getAsInt();
        int target = in.get(1).getAsInt();

        int[] result = new Solution().twoSumII(numbers, target);
        System.out.println(new Gson().toJson(result));
    }
}
